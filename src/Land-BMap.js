import { useMutation } from '@tanstack/react-query';
import { atom, useAtom } from 'jotai';
import React from 'react';
import {
  ColorPicker,
  Select,
  InputNumber,
  Space,
  Card,
  Button,
  Textarea,
  Row,
  Col,
} from 'tdesign-react';

const showed = atom(0);
const layers = atom([]);

const mapRef = React.createRef();

let mapInstance;
let drawingManager;

const polygonOptions = {
  strokeWeight: 1, // 多边形边线宽度
  strokeColor: "#4250FF", // 多边形边线颜色
  fillColor: "#4250FF", // 多边形填充颜色。当参数为空时，多边形将没有填充效果。
  strokeOpacity: 1, // 边线透明度，取值范围0 - 1。
  fillOpacity: 0.2, // 填充透明度，取值范围0 - 1。
  strokeStyle: "solid", // 边线样式，solid或dashed。
};

function drawOverlay(layer, index, setIndex) {
  if (!Array.isArray(layer.points) || !layer.points.length) {
    console.log('no points')
    return;
  }
  const overlay = new window.BMapGL.Polygon(
    layer.points.map(point => new window.BMapGL.Point(point.lng, point.lat)),
    layer.polygonOptions || polygonOptions,
  );
  mapInstance.addOverlay(overlay);
  if (layer._id) {
    overlay.addEventListener('mouseover', () => {
      overlay.setFillOpacity(0.6);
    });
    overlay.addEventListener('mouseout', () => {
      overlay.setFillOpacity(0.2);
    });
    overlay.addEventListener('click', e => {
      setIndex(index);
    });
  }
  return overlay;
}

export default function FarmLand() {
  const [showingIndex, setIndex] = useAtom(showed);
  const [_layers, setLayers] = useAtom(layers);

  React.useEffect(() => {
    // 初始化地图
    mapInstance = new window.BMapGL.Map(mapRef.current);
    mapInstance.setMapType(window.BMAP_SATELLITE_MAP);
    mapInstance.enableScrollWheelZoom(true);
    drawingManager = new window.BMapGLLib.DrawingManager(mapInstance, {
      isOpen: false, // 是否开启绘制模式
      enableDrawingTool: true, // 是否显示工具栏
      drawingToolOptions: {
        anchor: window.BMAP_ANCHOR_TOP_RIGHT, // 工具栏位置
        offset: new window.BMapGL.Size(5, 5), // 工具栏偏移量
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
        setLayers(data.data);
      });
    });
    fetch(`${process.env.REACT_APP_LAYER_API}`)
      .then(res => res.json())
      .then(data => {
        mapInstance.centerAndZoom(new window.BMapGL.Point(116.331398, 39.897445), 11);
        if (data.data.some(layer => layer.points)) {
          const [point] = data.data.find(layer => Array.isArray(layer.points)).points;
          mapInstance.centerAndZoom(new window.BMapGL.Point(point.lng, point.lat), 17);
        } else {
          mapInstance.centerAndZoom(data.center, data.zoomLevel);
        }
        // setCenter(data.center);
        setLayers(data.data);
      });
  }, []);

  React.useEffect(() => {
    mapInstance?.clearOverlays?.();
    _layers.forEach((layer, index) => drawOverlay(layer, index, setIndex));
  }, [_layers, setIndex]);

  const goPrev = React.useCallback(() => {
    let nextIndex = showingIndex - 1;
    if (nextIndex < 0 || !_layers[nextIndex].points) {
      nextIndex = _layers.findLastIndex(layer => Array.isArray(layer.points));
    }
    setIndex(nextIndex);
  }, [_layers, showingIndex, setIndex]);
  const goNext = React.useCallback(() => {
    let nextIndex = showingIndex + 1;
    if (nextIndex >= _layers.length || !_layers[nextIndex].points) {
      nextIndex = _layers.findIndex(layer => Array.isArray(layer.points));
    }
    setIndex(nextIndex);
  }, [_layers, showingIndex, setIndex]);

  return <div className="container my-24 mx-auto md:px-6">
    <section className="mb-32">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/assets/avator.jpeg" className="mr-2 h-8 rounded-full" alt="avatar" loading="lazy" />
          <span> CreatedAt <u>17-11-2023</u></span>
        </div>
        <div className="flex items-center justify-end">
          Total {_layers.length} Lands. &nbsp;&nbsp;
          <Button
            className="mr-2"
            onClick={goPrev}>
            Prev Land
          </Button>
          <Button
            className="mr-2"
            onClick={goNext}>
            Next Land
          </Button>
        </div>
      </div>

      <div
        ref={mapRef}
        className="mb-6 w-full rounded-lg shadow-lg dark:shadow-black/20 relative h-[45vh]">
        {!window.BMapGL ? 'No BMap Found' : ''}
      </div>

      <LandConf index={showingIndex} />
    </section>
  </div>;
};

function LandConf({ index: rowIndex }) {
  const [_layers, setLayers] = useAtom(layers);
  const row = _layers[rowIndex];

  React.useEffect(() => {
    const [point] = row?.points || [];
    if (point?.lng && point.lat) {
      mapInstance.centerAndZoom(new window.BMapGL.Point(point.lng, point.lat), 17);
    }
  }, [row]);

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
        setLayers(data.data);
      });
    }
  });

  const setStyle = React.useCallback((k, v) => setLayers(list => {
    list = list.slice();
    if (!list[rowIndex].polygonOptions) {
      list[rowIndex].polygonOptions = {};
    }
    list[rowIndex].polygonOptions[k] = v;
    return list;
  }), [rowIndex, setLayers]);

  if (!row) {
    return null;
  }
  return <Card
    title={row._id}
    actions={<div className="flex items-center justify-start gap-3">
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
    </div>}
    hoverShadow>
    <Row>
      <Col span={6}>
        <Space direction="vertical" className="w-[90%]">
          <div>
            <h5>points</h5>
            <Textarea
              disabled={onUpdate.isPending || onDelete.isPending}
              className="text-[12px] !h-[383px]"
              resizable={false}
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
              }} />
          </div>
        </Space>
      </Col>
      <Col span={6}>
        <Space direction="vertical" className="w-[90%]">
          <div>
            <h5>strokeWeight</h5>
            <InputNumber
              disabled={onUpdate.isPending || onDelete.isPending}
              min={1}
              value={row.polygonOptions?.strokeWeight ?? polygonOptions.strokeWeight}
              onChange={v => setStyle('strokeWeight', v)} />
          </div>
          <div>
            <h5>strokeColor</h5>
            <ColorPicker
              disabled={onUpdate.isPending || onDelete.isPending}
              value={row.polygonOptions?.strokeColor ?? polygonOptions.strokeColor}
              onChange={v => setStyle('strokeColor', v)} />
          </div>
          <div>
            <h5>fillColor</h5>
            <ColorPicker
              disabled={onUpdate.isPending || onDelete.isPending}
              value={row.polygonOptions?.fillColor ?? polygonOptions.fillColor}
              onChange={v => setStyle('fillColor', v)} />
          </div>
          <div>
            <h5>strokeOpacity</h5>
            <InputNumber
              disabled={onUpdate.isPending || onDelete.isPending}
              min={.1}
              step={.1}
              max={1}
              value={row.polygonOptions?.strokeOpacity ?? polygonOptions.strokeOpacity}
              onChange={v => setStyle('strokeOpacity', v)} />
          </div>
          <div>
            <h5>fillOpacity</h5>
            <InputNumber
              disabled={onUpdate.isPending || onDelete.isPending}
              min={.1}
              step={.1}
              max={1}
              value={row.polygonOptions?.fillOpacity ?? polygonOptions.fillOpacity}
              onChange={v => setStyle('fillOpacity', v)} />
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
              onChange={v => setStyle('strokeStyle', v)} />
          </div>
        </Space>
      </Col>
    </Row>
  </Card>
}
