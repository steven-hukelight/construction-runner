"use client";

import { useState } from "react";
import { EnhancedCard } from "./ui/enhanced-card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Activity, PieChart as PieChartIcon } from "lucide-react";

interface DashboardChartsProps {
  sites: any[];
  rams: any[];
  users: any[];
  tasks: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#0ea5e9', '#f59e0b', '#ef4444'];

// Helper function to get month name
function getMonthName(monthIndex: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex];
}

// Helper to process data by month
function getMonthlyActivityData(sites: any[], rams: any[], users: any[]) {
  const monthlyMap = new Map();
  const now = new Date();
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthlyMap.set(key, {
      month: getMonthName(date.getMonth()),
      year: date.getFullYear(),
      sites: 0,
      rams: 0,
      users: 0,
    });
  }
  
  const parseDate = (val: unknown): Date | null => {
    if (!val) return null;
    if (typeof val === "string") return new Date(val);
    if (typeof val === "object" && val !== null && typeof (val as { toDate?: () => Date }).toDate === "function") return (val as { toDate: () => Date }).toDate();
    try {
      return new Date(val as number | Date);
    } catch {
      return null;
    }
  };

  // Count sites by month (API returns created_at, server may use createdAt)
  sites?.forEach((item: any) => {
    const ts = item.created_at ?? item.createdAt;
    const date = parseDate(ts);
    if (!date) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthlyMap.has(key)) {
      monthlyMap.get(key).sites++;
    }
  });

  // Count RAMS by month
  rams?.forEach((item: any) => {
    const ts = item.created_at ?? item.createdAt;
    const date = parseDate(ts);
    if (!date) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthlyMap.has(key)) {
      monthlyMap.get(key).rams++;
    }
  });

  // Count users by month
  users?.forEach((item: any) => {
    const ts = item.created_at ?? item.createdAt;
    const date = parseDate(ts);
    if (!date) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthlyMap.has(key)) {
      monthlyMap.get(key).users++;
    }
  });
  
  return Array.from(monthlyMap.values());
}

// Helper to get growth trend data
function getGrowthTrendData(sites: any[], rams: any[], users: any[]) {
  const monthlyData = getMonthlyActivityData(sites, rams, users);
  
  return monthlyData.map((data, index) => {
    // Calculate cumulative totals
    let totalSites = 0;
    let totalRams = 0;
    let totalUsers = 0;
    
    for (let i = 0; i <= index; i++) {
      totalSites += monthlyData[i].sites;
      totalRams += monthlyData[i].rams;
      totalUsers += monthlyData[i].users;
    }
    
    return {
      month: data.month,
      sites: totalSites,
      rams: totalRams,
      users: totalUsers,
    };
  });
}

export function DashboardCharts({ sites, rams, users, tasks }: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'growth'>('activity');
  const [ramsView, setRamsView] = useState<'pie' | 'bar'>('pie');
  const [taskView, setTaskView] = useState<'status' | 'trend'>('status');
  
  // Generate chart data from dashboard props
  const monthlyActivityData = getMonthlyActivityData(sites, rams, users);
  const growthTrendData = getGrowthTrendData(sites, rams, users);

  // RAMS status distribution
  const ramsStatusData = [
    { name: 'Approved', value: rams?.filter((r: any) => r.status === 'APPROVED')?.length || 0 },
    { name: 'Pending', value: rams?.filter((r: any) => r.status === 'PENDING')?.length || 0 },
    { name: 'Rejected', value: rams?.filter((r: any) => r.status === 'REJECTED')?.length || 0 },
  ].filter(item => item.value > 0);

  // Task completion data - calculate based on actual task status if available
  const taskData = [
    { name: 'Completed', value: tasks?.filter((t: any) => t.status === 'COMPLETED')?.length || 0 },
    { name: 'In Progress', value: tasks?.filter((t: any) => t.status === 'IN_PROGRESS')?.length || 0 },
    { name: 'Pending', value: tasks?.filter((t: any) => t.status === 'PENDING' || !t.status)?.length || 0 },
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Activity / Growth Trends with Tabs */}
      <EnhancedCard gradient delay={0.5}>
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'activity'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Monthly Activity
              </div>
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'growth'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Growth Trends
              </div>
            </button>
          </div>
        </div>

        {/* Chart content */}
        {activeTab === 'activity' ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="sites" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Sites Created" />
              <Line type="monotone" dataKey="rams" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="RAMS Added" />
              <Line type="monotone" dataKey="users" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="Users Joined" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={growthTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="sites" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Total Sites" />
              <Bar dataKey="rams" fill="#10b981" radius={[8, 8, 0, 0]} name="Total RAMS" />
              <Bar dataKey="users" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Total Users" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </EnhancedCard>

      {/* RAMS Status Distribution */}
      <EnhancedCard gradient delay={0.6}>
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl">
            <button
              onClick={() => setRamsView('pie')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                ramsView === 'pie'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                Distribution
              </div>
            </button>
            <button
              onClick={() => setRamsView('bar')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                ramsView === 'bar'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Comparison
              </div>
            </button>
          </div>
        </div>

        {/* Chart content */}
        {ramsView === 'pie' ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ramsStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#3b82f6"
                dataKey="value"
              >
                {ramsStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ramsStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </EnhancedCard>

      {/* Task Status */}
      <EnhancedCard gradient delay={0.7}>
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl">
            <button
              onClick={() => setTaskView('status')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                taskView === 'status'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Current Status
              </div>
            </button>
            <button
              onClick={() => setTaskView('trend')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                taskView === 'trend'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Over Time
              </div>
            </button>
          </div>
        </div>

        {/* Chart content */}
        {taskView === 'status' ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="sites" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Tasks Created" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </EnhancedCard>
    </div>
  );
}
