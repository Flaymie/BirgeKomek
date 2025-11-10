import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FiUsers, FiFileText, FiCheckSquare, FiMessageSquare, FiAlertTriangle, FiFlag } from 'react-icons/fi';

const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center gap-5 border-l-4" style={{ borderColor: color }}>
    <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
      {React.cloneElement(icon, { size: 28, color })}
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await adminService.getStats();
        setStats(res.data);
      } catch (err) {
        toast.error(err.response?.data?.msg || "Не удалось загрузить статистику");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-10">Не удалось загрузить данные. Попробуйте позже.</div>;
  }

  const generalStatsCards = [
    { title: 'Всего пользователей', value: stats.general.totalUsers, icon: <FiUsers />, color: '#3B82F6' },
    { title: 'Всего заявок', value: stats.general.totalRequests, icon: <FiFileText />, color: '#10B981' },
    { title: 'Решенных заявок', value: stats.general.completedRequests, icon: <FiCheckSquare />, color: '#8B5CF6' },
    { title: 'Всего сообщений', value: stats.general.totalMessages, icon: <FiMessageSquare />, color: '#F59E0B' },
    { title: 'Всего жалоб', value: stats.general.totalReports, icon: <FiAlertTriangle />, color: '#EF4444' },
    { title: 'Открытых жалоб', value: stats.general.openReports, icon: <FiFlag />, color: '#EC4899' },
  ];

  const pieChartData = stats.charts.requestsBySubject.map(item => ({ name: item._id, value: item.count }));
  const registrationsByDay = stats.charts.registrationsByDay || [];

  const totalWeeklyRegistrations = registrationsByDay.reduce((sum, item) => sum + item.count, 0);
  
  const dailyAverage = registrationsByDay.length > 0 
    ? (totalWeeklyRegistrations / registrationsByDay.length).toFixed(1) 
    : '0.0';
    
  const maxInDay = registrationsByDay.length > 0 
    ? Math.max(...registrationsByDay.map(item => item.count)) 
    : 0;
    
  const minInDay = registrationsByDay.length > 0 
    ? Math.min(...registrationsByDay.map(item => item.count)) 
    : 0;

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Панель аналитики</h1>

        {/* Секция с карточками */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {generalStatsCards.map(card => <StatCard key={card.title} {...card} />)}
        </div>

        {/* Секция с графиками */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* График регистраций */}
          <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Динамика регистраций</h2>
                <p className="text-sm text-gray-500 mt-1">Новые пользователи за последние 7 дней</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-700">
                  Всего: {totalWeeklyRegistrations}
                </span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl mb-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={stats.charts.registrationsByDay} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" />
                  <XAxis 
                    dataKey="_id" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#d1d5db' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Новые пользователи" 
                    stroke="#8884d8" 
                    strokeWidth={4}
                    fill="url(#colorGradient)"
                    activeDot={{ 
                      r: 8, 
                      fill: '#8884d8',
                      stroke: '#fff',
                      strokeWidth: 3,
                      shadow: '0 0 10px rgba(136, 132, 216, 0.5)'
                    }}
                    dot={{ 
                      r: 5, 
                      fill: '#8884d8',
                      stroke: '#fff',
                      strokeWidth: 2
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Дополнительная статистика */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Среднее в день</p>
                <p className="text-lg font-bold text-gray-800">
                  {dailyAverage}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Максимум</p>
                <p className="text-lg font-bold text-gray-800">
                  {maxInDay}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Минимум</p>
                <p className="text-lg font-bold text-gray-800">
                  {minInDay}
                </p>
              </div>
            </div>
          </div>

          {/* Диаграмма по предметам */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Заявки по предметам</h2>
            
            {/* Диаграмма */}
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie 
                    data={pieChartData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    outerRadius={90} 
                    fill="#8884d8" 
                    dataKey="value" 
                    nameKey="name"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Легенда с подробностями */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Детализация</h3>
              {pieChartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700 truncate">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{entry.value}</span>
                    <span className="text-xs text-gray-500">
                      ({((entry.value / pieChartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;