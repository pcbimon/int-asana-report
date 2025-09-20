"use client";

import {
    Card,
    CardContent,
} from "@/components/ui/card";
import ReactECharts from 'echarts-for-react';
export default function WeeklySummaryChart() {
    return (
        <Card>
            <CardContent>
                <ReactECharts option={{
                    title: {
                        text: 'Weekly Task Summary'
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    legend: {
                        data: ['Assigned','Completed','Overdue','Collab','Expected']
                    },
                    grid: { top: 60, left: 40, right: 20, bottom: 40 },
                    xAxis: {
                        type: 'category',
                        data: ['12 May 2025', '13 May 2025', '14 May 2025', '15 May 2025', '16 May 2025', '17 May 2025', '18 May 2025']
                    },
                    yAxis: {
                        type: 'value',
                        name: 'Tasks',
                        min: 0,
                        interval: 1
                    },
                    series: [
                        {
                            name: 'Assigned',
                            type: 'line',
                            symbol: 'circle',
                            smooth: true,
                            lineStyle: { type: 'solid', color: '#3498db' }, // blue solid (assigned)
                            itemStyle: { color: '#2980b9' },
                            areaStyle: { color: 'rgba(52, 152, 219, 0.12)' },
                            data: [1,2,3,1,2,0,4]
                        },
                        {
                            name: 'Completed',
                            type: 'line',
                            symbol: 'circle',
                            smooth: true,
                            lineStyle: {
                                type: 'solid',
                                color: '#2ecc71' // green (swapped)
                            },
                            itemStyle: { color: '#27ae60' },
                            areaStyle: { color: 'rgba(46, 204, 113, 0.12)' },
                            data: [0,1,2,1,3,1,2]
                        },
                        {
                            name: 'Overdue',
                            type: 'bar',
                            barWidth: '40%',
                            itemStyle: { color: '#e74c3c' }, // red
                            data: [0,0,1,0,0,2,0]
                        },
                        {
                            name: 'Collab',
                            type: 'line',
                            symbol: 'diamond',
                            smooth: true,
                            lineStyle: { type: 'dashed', color: '#8e44ad' }, // purple dashed (collab)
                            itemStyle: { color: '#8e44ad' },
                            data: [1,1,1,2,1,1,3]
                        },
                        {
                            name: 'Expected',
                            type: 'line',
                            symbol: 'circle',
                            smooth: true,
                            lineStyle: { type: 'dotted', color: '#f1c40f' }, // yellow dotted
                            itemStyle: { color: '#d35400' },
                            data: [3,3,3,3,3,3,3]
                        }
                    ]
                }} />
            </CardContent>
        </Card>
    )
}