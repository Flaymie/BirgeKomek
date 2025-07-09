import React, { useState, useEffect } from 'react';
import { statsService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
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
        const res = await statsService.getStats();
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">Динамика регистраций (7 дней)</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={stats.charts.registrationsByDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Новые пользователи" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Диаграмма по предметам */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Заявки по предметам</h2>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} outerRadius={120} fill="#8884d8" dataKey="value" nameKey="name" label={(props) => `${props.name} (${props.value})`}>
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 