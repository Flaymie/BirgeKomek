import React, { useState } from 'react';
import { authService } from '../../services/api';
import AvatarInput from '../common/AvatarInput';

const Register = () => {
    const [avatarFile, setAvatarFile] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== passwordConfirm) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('role', role);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        try {
            const data = await authService.register(formData);
            login(data.token, data.user);
            toast.success('Регистрация прошла успешно! Добро пожаловать!');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.msg || 'Ошибка регистрации');
            toast.error(err.response?.data?.msg || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center">Регистрация</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center">
                        <AvatarInput onFileChange={(file) => setAvatarFile(file)} />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register; 