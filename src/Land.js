import { useMutation } from '@tanstack/react-query';
import { atom, useAtom } from 'jotai';
import React from 'react';
import {
  ColorPicker,
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

const polygonOptions = {
  strokeThickness: 1, // 多边形边线宽度
  strokeColor: "rgba(242, 12, 31, 1)", // 多边形边线颜色
  fillColor: "rgba(245, 5, 25, 0.21)", // 多边形填充颜色
};

function drawOverlay(layer, index, setIndex) {
  if (!Array.isArray(layer.points) || !layer.points.length) {
    console.log('no points')
    return;
  }
  const overlay = new window.Microsoft.Maps.Polygon(
    layer.points.map(point => new window.Microsoft.Maps.Location(point.lat, point.lng)),
    layer.polygonOptions || polygonOptions,
  );
  mapInstance.entities.push(overlay);
  if (layer._id) {
    window.Microsoft.Maps.Events.addHandler(overlay, 'mouseover', () => {
      overlay.setOptions({
        fillOpacity: 0.6,
      });
    });
    window.Microsoft.Maps.Events.addHandler(overlay, 'mouseout', () => {
      overlay.setOptions({
        fillOpacity: 0.2,
      });
    });
    window.Microsoft.Maps.Events.addHandler(overlay, 'click', e => {
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
    mapInstance = new window.Microsoft.Maps.Map(mapRef.current, {});
    window.Microsoft.Maps.loadModule('Microsoft.Maps.DrawingTools', () => {
      const tools = new window.Microsoft.Maps.DrawingTools(mapInstance);
      tools.showDrawingManager(function (manager) {
        console.log('Drawing manager loaded.');
        manager.setOptions({
          drawingBarActions: window.Microsoft.Maps.DrawingTools.DrawingMode.polygon,
          polygonOptions,
        });
        window.Microsoft.Maps.Events.addHandler(manager, 'drawingEnded', function (polygon) {
          const points = polygon.getLocations().map(loc => ({
            lng: loc.longitude,
            lat: loc.latitude,
          })); // 获取多边形的坐标点数组
          console.log(points);
          fetch(`${process.env.REACT_APP_BING_LAYER_API}`, {
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
      });

      fetch(`${process.env.REACT_APP_BING_LAYER_API}`)
        .then(res => res.json())
        .then(data => {
          mapInstance.setView({
            center: new window.Microsoft.Maps.Location(39.897445, 116.331398),
            zoom: 11,
          });
          if (data.data.some(layer => layer.points)) {
            const [point] = data.data.find(layer => Array.isArray(layer.points)).points;
            mapInstance.setView({
              center: new window.Microsoft.Maps.Location(point.lat, point.lng),
              zoom: 17,
            });
          }
          setLayers(data.data);
        });
    });
  }, []);

  React.useEffect(() => {
    mapInstance?.entities?.clear?.();
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
        {!window.Microsoft.Maps ? 'No BMap Found' : ''}
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
      mapInstance.setView({
        center: new window.Microsoft.Maps.Location(point.lat, point.lng),
        zoom: 17,
      });
    }
  }, [row]);

  const onUpdate = useMutation({
    mutationFn: row => {
      return fetch(`${process.env.REACT_APP_BING_LAYER_API}`, {
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
      return fetch(`${process.env.REACT_APP_BING_LAYER_API}`, {
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
            <h5>strokeThickness</h5>
            <InputNumber
              disabled={onUpdate.isPending || onDelete.isPending}
              min={1}
              value={row.polygonOptions?.strokeThickness ?? polygonOptions.strokeThickness}
              onChange={v => setStyle('strokeThickness', v)} />
          </div>
          <div>
            <h5>strokeColor</h5>
            <ColorPicker
              format="RGBA"
              enableAlpha
              disabled={onUpdate.isPending || onDelete.isPending}
              value={row.polygonOptions?.strokeColor ?? polygonOptions.strokeColor}
              onChange={v => setStyle('strokeColor', v)} />
          </div>
          <div>
            <h5>fillColor</h5>
            <ColorPicker
              format="RGBA"
              enableAlpha
              disabled={onUpdate.isPending || onDelete.isPending}
              value={row.polygonOptions?.fillColor ?? polygonOptions.fillColor}
              onChange={v => setStyle('fillColor', v)} />
          </div>
        </Space>
      </Col>
    </Row>
  </Card>
}
