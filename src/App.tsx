import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingScreen } from './components/LandingScreen';
import { EmployeeScreen } from './components/EmployeeScreen';
import { AdminScreen } from './components/AdminScreen';
import { CounterTerminal } from './components/CounterTerminal';
import { DailyClosingModal } from './components/DailyClosingModal';
import {
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import './styles/index.css';
import './styles/components.css';

const MainApp: React.FC = () => {
  const {
    currentScreen,
    isCounterModalOpen,
    closeCounterModal,
    counterInitialType,
    toastMessage,
  } = useApp();

  return (
    <div className="app-container">
      <main className="main-content">
        {currentScreen === 'landing' && <LandingScreen />}
        {currentScreen === 'employee' && <EmployeeScreen />}
        {currentScreen === 'admin' && <AdminScreen />}
      </main>

      {/* Global Modals */}
      <CounterTerminal
        isOpen={isCounterModalOpen}
        onClose={closeCounterModal}
        initialType={counterInitialType}
      />
      <DailyClosingModal />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <div className={`toast ${toastMessage.type}`}>
            {toastMessage.type === 'success' && <CheckCircle size={16} />}
            {toastMessage.type === 'error' && <AlertCircle size={16} />}
            {toastMessage.type === 'info' && <Info size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
