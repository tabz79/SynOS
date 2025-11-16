import React from 'react';
import ReceptionCheckinFlow from './ReceptionCheckinFlow';
import VisitListPage from './VisitListPage';

const VisitsPage: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Visits Management</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <ReceptionCheckinFlow />
        </div>
        <div>
          <VisitListPage />
        </div>
      </div>
    </div>
  );
};

export default VisitsPage;
