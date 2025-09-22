"use client";

import {
    Card,
    CardContent,
} from "@/components/ui/card";
import ReactECharts from 'echarts-for-react';
import { WeeklyPoint } from "@/lib/types";

export default function WeeklySummaryChart({ data }: { data: WeeklyPoint[] }) {
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
                        data: ['Assigned','Completed','Overdue','Collab','Expected'],
                        bottom: 0,
                        left: 'center',
                        orient: 'horizontal'
                    },
                    // grid: { top: 60, left: 40, right: 20, bottom: 40 },
                    xAxis: {
                        type: 'category',
                        data: data.map(d => d.week)
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
                            data: data.map(d => d.assigned)
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
                            data: data.map(d => d.completed)
                        },
                        {
                            name: 'Overdue',
                            type: 'bar',
                            barWidth: '40%',
                            itemStyle: { color: '#e74c3c' }, // red
                            data: data.map(d => d.overdue)
                        },
                        {
                            name: 'Collab',
                            type: 'line',
                            symbol: 'diamond',
                            smooth: true,
                            lineStyle: { type: 'dashed', color: '#8e44ad' }, // purple dashed (collab)
                            itemStyle: { color: '#8e44ad' },
                            data: data.map(d => d.collab)
                        },
                        {
                            name: 'Expected',
                            type: 'line',
                            symbol: 'circle',
                            smooth: true,
                            lineStyle: { type: 'dotted', color: '#f1c40f' }, // yellow dotted
                            itemStyle: { color: '#f1c40f' },
                            data: data.map(d => d.expected)
                        }
                    ]
                }} />
            </CardContent>
        </Card>
    )
}