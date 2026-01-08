import React from 'react';
import ReactECharts from 'echarts-for-react';

interface RadarChartProps {
  title: string;
  data: { name: string; value: number }[];
  height: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ title, data, height }) => {
  const getOption = () => {
    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderColor: 'rgba(102, 126, 234, 0.3)',
        textStyle: {
          color: '#ffffff'
        }
      },
      radar: {
        indicator: data.map(item => ({
          name: item.name,
          max: 5
        })),
        shape: 'circle',
        splitNumber: 5,
        axisName: {
          color: '#b3c6ff'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(102, 126, 234, 0.2)'
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(102, 126, 234, 0.05)', 'rgba(102, 126, 234, 0.1)']
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(102, 126, 234, 0.3)'
          }
        }
      },
      series: [
        {
          name: '风险评估',
          type: 'radar',
          data: [
            {
              value: data.map(item => item.value),
              name: '风险等级',
              areaStyle: {
                color: 'rgba(102, 126, 234, 0.2)'
              },
              lineStyle: {
                color: '#667eea',
                width: 2
              },
              itemStyle: {
                color: '#667eea'
              }
            }
          ]
        }
      ]
    };
  };

  return (
    <div className="w-full h-full">
      <ReactECharts
        option={getOption()}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{
          renderer: 'canvas',
          useDirtyRect: false
        }}
      />
    </div>
  );
};

export default RadarChart;