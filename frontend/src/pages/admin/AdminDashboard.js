import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FiAlertTriangle } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


const RegistrationsChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/godmode/charts/user-registrations');
        setData(res.data);
      } catch (error) {
        console.error("Failed to fetch chart data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-full flex items-center justify-center animate-pulse"><p className="text-gray-500">Загрузка...</p></div>;
  }

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-full">
      <h3 className="font-semibold text-gray-800 mb-4">Новые пользователи (7 дней)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
           <XAxis dataKey="shortDate" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
           <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={30}/>
           <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
           <Tooltip
             contentStyle={{
               backgroundColor: '#ffffff',
               borderColor: '#E5E7EB',
               borderRadius: '0.75rem',
               boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
             }}
           />
           <Area type="monotone" dataKey="count" stroke="#4F46E5" fill="#C7D2FE" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/godmode/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Ошибка при загрузке статистики:', err);
        setError(err.response?.data?.message || 'Не удалось загрузить статистику.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  const StatCard = ({ title, value }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '...'}</p>
    </div>
  );
  
  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
          ))}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg flex items-center gap-4">
        <FiAlertTriangle className="w-8 h-8 text-red-500" />
        <div>
          <h2 className="text-lg font-bold text-red-800">Ошибка доступа</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <StatCard title="Пользователи" value={stats?.totalUsers} />
        <StatCard title="Хелперы" value={stats?.helpersCount} />
        <StatCard title="Активные заявки" value={stats?.openRequests} />
        <StatCard title="Выполненные" value={stats?.closedRequests} />
        <StatCard title="Новые сегодня" value={stats?.newUsersToday} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RegistrationsChart />
        </div>
        <div className="lg:col-span-1">
           <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-full">
              <h3 className="font-semibold text-gray-800 mb-3">Последние действия</h3>
              <p className="text-sm text-gray-500">Лента последних действий модераторов и пользователей появится здесь в ближайшее время.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 