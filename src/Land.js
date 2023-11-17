import { useMutation } from '@tanstack/react-query';
import { atom, useAtom } from 'jotai';
import React from 'react';
import {
  ColorPicker,
  Select,
  Input,
  InputNumber,
  Space,
  Table,
  Button,
  Textarea,
} from 'tdesign-react';

const layers = atom(
  [],
  (get, set, newLayers) => {
    drawOverlays(newLayers);
    return newLayers;
  },
);
const mapRef = React.createRef();

let bmapInstance;
let drawingManager;

const polygonOptions = {
  strokeWeight: 1, // 多边形边线宽度
  strokeColor: "#4250FF", // 多边形边线颜色
  fillColor: "#4250FF", // 多边形填充颜色。当参数为空时，多边形将没有填充效果。
  strokeOpacity: 1, // 边线透明度，取值范围0 - 1。
  fillOpacity: 0.2, // 填充透明度，取值范围0 - 1。
  strokeStyle: "solid", // 边线样式，solid或dashed。
};

function drawOverlay(layer) {
  if (!Array.isArray(layer.points) || !layer.points.length) {
    console.log('no points')
    return;
  }
  const overlay = new window.BMap.Polygon(
    layer.points.map(point => new window.BMap.Point(point.lng, point.lat)),
    layer.polygonOptions || polygonOptions,
  );
  bmapInstance.addOverlay(overlay);
  if (layer._id) {
    overlay.addEventListener('mouseover', () => {
      overlay.setFillOpacity(0.6);
    });
    overlay.addEventListener('mouseout', () => {
      overlay.setFillOpacity(0.2);
    });
  }
  return overlay;
}

function drawOverlays(data) {
  data.forEach(layer => drawOverlay(layer));
}

export default function FarmLand() {
  const [center, setCenter] = React.useState('');
  const [_layers, setLayers] = useAtom(layers);

  React.useEffect(() => {
    // 初始化地图
    bmapInstance = new window.BMap.Map(mapRef.current);
    bmapInstance.setMapType(window.BMAP_SATELLITE_MAP);
    bmapInstance.enableScrollWheelZoom(true);
    drawingManager = new window.BMapLib.DrawingManager(bmapInstance, {
      isOpen: false, // 是否开启绘制模式
      enableDrawingTool: true, // 是否显示工具栏
      drawingToolOptions: {
        anchor: window.BMAP_ANCHOR_TOP_RIGHT, // 工具栏位置
        offset: new window.BMap.Size(5, 5), // 工具栏偏移量
        drawingModes: [
          window.BMAP_DRAWING_POLYGON,
        ],
      },
      polygonOptions,
    });
    drawingManager.addEventListener("polygoncomplete", function (polygon) {
      const points = polygon.getPath(); // 获取多边形的坐标点数组
      console.log(points);
      fetch(`${process.env.REACT_APP_LAYER_API}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points,
        }),
      }).then(res => res.json()).then(data => {
        bmapInstance.clearOverlays();
        setLayers(data.data);
      });
    });
    fetch(`${process.env.REACT_APP_LAYER_API}`)
      .then(res => res.json())
      .then(data => {
        bmapInstance.centerAndZoom(new window.BMap.Point(116.331398, 39.897445), 11);
        bmapInstance.centerAndZoom(data.center, data.zoomLevel);
        setCenter(data.center);
        setLayers(data.data);
      });
  }, []);

  const onUpdate = useMutation({
    mutationFn: row => {
      return fetch(`${process.env.REACT_APP_LAYER_API}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          row,
        }),
      }).then(res => res.json()).then(data => {
        bmapInstance.clearOverlays();
        setLayers(data.data);
      });
    }
  });

  const onDelete = useMutation({
    mutationFn: id => {
      return fetch(`${process.env.REACT_APP_LAYER_API}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
        }),
      }).then(res => res.json()).then(data => {
        bmapInstance.clearOverlays();
        setLayers(data.data);
      });
    }
  })

  const onChangeCenter = useMutation({
    mutationFn: v => {
      bmapInstance.centerAndZoom(v, 20);
      setCenter(v);
      return fetch(`${process.env.REACT_APP_LAYER_API}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center: v,
        }),
      });
    },
  });

  return <div className="container my-24 mx-auto md:px-6">
    <section className="mb-32">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/assets/avator.jpeg" className="mr-2 h-8 rounded-full" alt="avatar" loading="lazy" />
          <span> CreatedAt <u>17-11-2023</u></span>
        </div>
        <Input
          disabled={onChangeCenter.isPending}
          className="w-[280px]"
          value={center}
          onChange={setCenter}
          onBlur={onChangeCenter.mutate} />
      </div>

      <div
        ref={mapRef}
        className="mb-6 w-full rounded-lg shadow-lg dark:shadow-black/20 relative h-[76vh]">
        {!window.BMap ? 'No BMap Found' : ''}
      </div>

      <Table
        data={_layers.filter(r => !!r.points)}
        columns={[
          // { colKey: '_id', title: 'ID', width: 80 },
          { colKey: 'createdAt', title: 'CreatedAt', width: 220 },
          {
            colKey: 'points',
            title: 'LngLat',
            cell: ({ row, rowIndex }) => <Textarea
              disabled={onUpdate.isPending || onDelete.isPending}
              autosize
              className="text-[12px]"
              value={row.newPoints || JSON.stringify(row.points ?? [], null, 4)}
              onChange={v => {
                setLayers(list => {
                  list = list.slice();
                  list[rowIndex].newPoints = v;
                  return list;
                });
              }}
              onBlur={v => {
                try {
                  v = JSON.parse(v);
                  setLayers(list => {
                    list = list.slice();
                    list[rowIndex].points = v;
                    delete list[rowIndex].newPoints;
                    return list;
                  });
                } catch (e) {
                  console.error(e);
                  setLayers(list => {
                    list = list.slice();
                    delete list[rowIndex].newPoints;
                    return list;
                  });
                }
              }} />,
          },
          {
            colKey: 'polygonOptions',
            title: 'PolygonOptions',
            cell: ({ row, rowIndex }) => {
              const onUpdate = (k, v) => setLayers(list => {
                list = list.slice();
                if (!list[rowIndex].polygonOptions) {
                  list[rowIndex].polygonOptions = {};
                }
                list[rowIndex].polygonOptions[k] = v;
                return list;
              });
              return <Space direction="vertical">
                <div>
                  <h5>strokeWeight</h5>
                  <InputNumber
                    disabled={onUpdate.isPending || onDelete.isPending}
                    min={1}
                    value={row.polygonOptions?.strokeWeight ?? polygonOptions.strokeWeight}
                    onChange={v => onUpdate('strokeWeight', v)} />
                </div>
                <div>
                  <h5>strokeColor</h5>
                  <ColorPicker
                    disabled={onUpdate.isPending || onDelete.isPending}
                    value={row.polygonOptions?.strokeColor ?? polygonOptions.strokeColor}
                    onChange={v => onUpdate('strokeColor', v)} />
                </div>
                <div>
                  <h5>fillColor</h5>
                  <ColorPicker
                    disabled={onUpdate.isPending || onDelete.isPending}
                    value={row.polygonOptions?.fillColor ?? polygonOptions.fillColor}
                    onChange={v => onUpdate('fillColor', v)} />
                </div>
                <div>
                  <h5>strokeOpacity</h5>
                  <InputNumber
                    disabled={onUpdate.isPending || onDelete.isPending}
                    min={.1}
                    step={.1}
                    max={1}
                    value={row.polygonOptions?.strokeOpacity ?? polygonOptions.strokeOpacity}
                    onChange={v => onUpdate('strokeOpacity', v)} />
                </div>
                <div>
                  <h5>fillOpacity</h5>
                  <InputNumber
                    disabled={onUpdate.isPending || onDelete.isPending}
                    min={.1}
                    step={.1}
                    max={1}
                    value={row.polygonOptions?.fillOpacity ?? polygonOptions.fillOpacity}
                    onChange={v => onUpdate('fillOpacity', v)} />
                </div>
                <div>
                  <h5>strokeStyle</h5>
                  <Select
                    disabled={onUpdate.isPending || onDelete.isPending}
                    options={[
                      { label: 'solid', value: 'solid' },
                      { label: 'dashed', value: 'dashed' },
                    ]}
                    value={row.polygonOptions?.strokeStyle ?? polygonOptions.strokeStyle}
                    onChange={v => onUpdate('strokeStyle', v)} />
                </div>
              </Space>;
            },
          },
          {
            colKey: 'operations',
            title: "Operations",
            cell: ({ row }) => {
              return <div className="flex items-center justify-start gap-3">
                <Button
                  disabled={onUpdate.isPending || onDelete.isPending}
                  size="small"
                  theme="primary"
                  onClick={() => {
                    onUpdate.mutate(row);
                  }}>
                  Update
                </Button>
                <Button
                  disabled={onUpdate.isPending || onDelete.isPending}
                  size="small"
                  theme="danger"
                  onClick={() => {
                    if (window.confirm('确定要删除该区域吗？')) {
                      onDelete.mutate(row._id);
                    }
                  }}>
                  Delete
                </Button>
              </div>;
            },
          }
        ]}
        rowKey="index"
        verticalAlign="top"
        size="small"
        bordered
        hover
        stripe
        showHeader
        rowClassName={({ rowIndex }) => `${rowIndex}-class`}
        cellEmptyContent={'-'} />
    </section>
  </div>;
};
