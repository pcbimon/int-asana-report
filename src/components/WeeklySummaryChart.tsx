/**
 * Weekly Summary Chart component using ECharts
 * Shows assigned vs completed tasks by week with expected completion line
 */

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { WeeklyData } from '@/models/asanaReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dayjs from 'dayjs';

interface WeeklySummaryChartProps {
  weeklyData: WeeklyData[];
  expectedCompletionTasks?: number;
  title?: string;
  height?: number;
}

export function WeeklySummaryChart({ 
  weeklyData, 
  expectedCompletionTasks = 3,
  title = 'Weekly Summary',
  height = 400 
}: WeeklySummaryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!chartRef.current || weeklyData.length === 0) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // Prepare data
    const weeks = weeklyData.map(d => dayjs(d.weekStart).format('DD MMM YYYY'));
  const assignedData = weeklyData.map(d => d.assigned);
  const completedData = weeklyData.map(d => d.completed);
  const overdueData = weeklyData.map(d => d.overdue || 0);
  const collabData = weeklyData.map(d => d.collab || 0);
  const expectedData = weeklyData.map(() => expectedCompletionTasks);

  // Determine y-axis bounds: ensure integer ticks and step of 1
  const maxAssignedValue = Math.max(...assignedData, 0);
  const maxCompletedValue = Math.max(...completedData, 0);
  const maxOverdueValue = Math.max(...overdueData, 0);
  const maxCollabValue = Math.max(...collabData, 0);
  const maxExpectedValue = Math.max(...expectedData, 0);
  const rawMax = Math.max(maxAssignedValue, maxCompletedValue, maxOverdueValue, maxExpectedValue);
  // Round up to nearest integer; ensure at least 1 so axis shows something when rawMax is 0
  const yMax = Math.max(1, Math.ceil(rawMax));

  // Chart configuration
    const option: echarts.EChartsOption = {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#374151',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
        formatter: function (params: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (!Array.isArray(params)) return '';
          
          const weekData = params[0];
          const week = weekData.axisValue;
          const assigned = params.find((p: any) => p.seriesName === 'Assigned')?.value || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
          const completed = params.find((p: any) => p.seriesName === 'Completed')?.value || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
          const expected = params.find((p: any) => p.seriesName === 'Expected')?.value || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
          const overdue = params.find((p: any) => p.seriesName === 'Overdue')?.value || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
          const collab = params.find((p: any) => p.seriesName === 'Collab')?.value || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
          
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${week}</div>
              <div style="display: flex; align-items: center; margin-bottom: 2px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #3b82f6; border-radius: 50%; margin-right: 8px;"></span>
                Assigned: ${assigned}
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 2px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; margin-right: 8px;"></span>
                Completed: ${completed}
              </div>
                <div style="display: flex; align-items: center; margin-bottom: 2px;">
                  <span style="display: inline-block; width: 10px; height: 10px; background-color: #ef4444; border-radius: 50%; margin-right: 8px;"></span>
                  Overdue: ${overdue}
                </div>
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #f59e0b; border-radius: 50%; margin-right: 8px;"></span>
                Expected: ${expected}
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: ['Assigned', 'Completed', 'Overdue', 'Collab', 'Expected'],
        bottom: 10,
        textStyle: {
          color: '#374151',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: weeks,
        axisLabel: {
          rotate: 45,
          color: '#6b7280',
          fontSize: 11,
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Tasks',
        min: 0,
        max: yMax,
        interval: 1,
        nameTextStyle: {
          color: '#6b7280',
        },
        axisLabel: {
          color: '#6b7280',
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: 'Assigned',
          type: 'line',
          data: assignedData,
          itemStyle: {
            color: '#3b82f6',
          },
          lineStyle: {
            color: '#3b82f6',
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.1)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
          smooth: true,
        },
        {
          name: 'Completed',
          type: 'line',
          data: completedData,
          itemStyle: {
            color: '#10b981',
          },
          lineStyle: {
            color: '#10b981',
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.1)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
          smooth: true,
        },
        {
          name: 'Overdue',
          type: 'line',
          data: overdueData,
          itemStyle: {
            color: '#ef4444',
          },
          lineStyle: {
            color: '#ef4444',
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.28)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.06)' },
            ]),
          },
          emphasis: {
            focus: 'series'
          },
          symbol: 'circle',
          symbolSize: 6,
          smooth: true,
          z: 2,
        },
        {
          name: 'Collab',
          type: 'line',
          data: collabData,
          itemStyle: {
            color: '#8b5cf6',
          },
          lineStyle: {
            color: '#8b5cf6',
            width: 2,
            type: 'dashed',
          },
          symbol: 'circle',
          symbolSize: 6,
          smooth: true,
          z: 1,
        },
        {
          name: 'Expected',
          type: 'line',
          data: expectedData,
          itemStyle: {
            color: '#f59e0b',
          },
          lineStyle: {
            color: '#f59e0b',
            width: 2,
            type: 'dashed',
          },
          symbol: 'none',
          smooth: false,
        },
      ],
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [weeklyData, expectedCompletionTasks, title]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (weeklyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div 
          ref={chartRef} 
          style={{ height: `${height}px`, width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}