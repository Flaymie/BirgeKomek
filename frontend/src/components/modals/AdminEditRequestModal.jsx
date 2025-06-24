import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { requestsService } from '../../services/api';

const AdminEditRequestModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (request) {
      // Заполняем форму текущими данными заявки
      setFormData({
        title: request.title || '',
        description: request.description || '',
        subject: request.subject?._id || request.subject || '', 
        grade: request.grade || '',
        status: request.status || '',
      });
    }
  }, [request]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (!reason.trim()) newErrors.reason = 'Причина обязательна';
    if (!formData.title.trim()) newErrors.title = 'Заголовок не может быть пустым';
    // Добавьте другие правила валидации по необходимости
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const updateData = { ...formData, reason };
      const updatedRequest = await requestsService.adminUpdateRequest(request._id, updateData);
      onSuccess(updatedRequest.data);
      toast.success('Заявка успешно обновлена!');
      handleClose();
    } catch (error) {
      console.error('Ошибка при обновлении заявки:', error);
      toast.error(error.response?.data?.msg || 'Не удалось обновить заявку');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setErrors({});
    setReason('');
    // Не сбрасываем formData, чтобы при повторном открытии были видны изменения
    onClose();
  }

  // TODO: Загружать список предметов из API
  const subjects = [
    { _id: '60c72b2f5f1b2c001f8e4d1e', name: 'Математика' },
    { _id: '60c72b2f5f1b2c001f8e4d1f', name: 'Физика' },
    { _id: '60c72b2f5f1b2c001f8e4d20', name: 'Химия' },
  ];

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} contentLabel="Редактирование заявки" className="modal-content" overlayClassName="modal-overlay">
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-xl font-bold mb-4">Редактирование заявки (Админ)</h2>
        
        {/* Поля формы */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div>
            <label htmlFor="title" className="label">Заголовок</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className="input" />
            {errors.title && <p className="error-text">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="description" className="label">Описание</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="input" rows="4"></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject" className="label">Предмет</label>
              <select name="subject" value={formData.subject} onChange={handleChange} className="input">
                 {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="grade" className="label">Класс</label>
              <input type="number" name="grade" value={formData.grade} onChange={handleChange} className="input" />
            </div>
          </div>
           <div>
              <label htmlFor="status" className="label">Статус</label>
              <select name="status" value={formData.status} onChange={handleChange} className="input">
                <option value="open">Открыта</option>
                <option value="assigned">Назначена</option>
                <option value="in_progress">В процессе</option>
                <option value="completed">Выполнена</option>
                <option value="closed">Закрыта</option>
                <option value="cancelled">Отменена</option>
              </select>
            </div>
        </div>

        <hr className="my-4"/>

        {/* Причина */}
        <div>
            <label htmlFor="reason" className="label text-yellow-700">Причина редактирования</label>
            <textarea name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className={`input ${errors.reason ? 'border-red-500' : ''}`} rows="2" placeholder="Объясните, почему вы вносите изменения"></textarea>
            {errors.reason && <p className="error-text">{errors.reason}</p>}
        </div>

        {/* Кнопки */}
        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={handleClose} className="btn-secondary">Отмена</button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AdminEditRequestModal;
