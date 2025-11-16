import React from 'react';
import AppointmentBookingForm from '../components/AppointmentBookingForm';
import AppointmentListPage from './AppointmentListPage';

const AppointmentsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Appointments</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <AppointmentBookingForm />
        </div>
        <div>
          <AppointmentListPage />
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPage;
