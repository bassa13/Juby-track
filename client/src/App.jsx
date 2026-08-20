import { useState } from 'react';
import { useJubyStore } from './core/store/useJubyStore.js';
import { LoginForm } from './features/staff/components/LoginForm.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';

// Feature Tabs
import { TablesTab } from './features/tables/components/TablesTab.jsx';
import { CashierTab } from './features/shifts/components/CashierTab.jsx';
import { PlayersTab } from './features/customers/components/PlayersTab.jsx';
import { PlayerProfileModal } from './features/customers/components/PlayerProfileModal.jsx';
import { PlayHistoryTab } from './features/sessions/components/PlayHistoryTab.jsx';
import { HistoryTab } from './features/sessions/components/HistoryTab.jsx';
import { StaffTab } from './features/staff/components/StaffTab.jsx';
import { ShiftsHistoryTab } from './features/shifts/components/ShiftsHistoryTab.jsx';
import { ReportsTab } from './features/reports/components/ReportsTab.jsx';
import { SettingsTab } from './features/settings/components/SettingsTab.jsx';

// Modals
import { StartGameModal } from './features/tables/components/StartGameModal.jsx';
import { EndGameModal } from './features/tables/components/EndGameModal.jsx';
import { AddFrameModal } from './features/tables/components/AddFrameModal.jsx';
import { PaymentModal } from './features/payments/components/PaymentModal.jsx';
import { QueueModal } from './features/tables/components/QueueModal.jsx';
import { TVDisplayModal } from './features/tables/components/TVDisplayModal.jsx';
import { CloseShiftModal } from './features/shifts/components/CloseShiftModal.jsx';
import { AddFauxMiseModal } from './features/shifts/components/AddFauxMiseModal.jsx';
import { SellJetonsModal } from './features/shifts/components/SellJetonsModal.jsx';
import { AddJetonsModal } from './features/shifts/components/AddJetonsModal.jsx';
import { EditGameModal } from './features/tables/components/EditGameModal.jsx';
import { StaffModal } from './features/staff/components/StaffModal.jsx';
import { PlayerModal } from './features/customers/components/PlayerModal.jsx';

export function App() {
  const [activeTab, setActiveTab] = useState('tables');
  const currentUser = useJubyStore((state) => state.currentUser);
  const pendingAction = useJubyStore((state) => state.pendingAction);
  const setPendingAction = useJubyStore((state) => state.setPendingAction);
  const openShift = useJubyStore((state) => state.openShift);
  const removeFauxMise = useJubyStore((state) => state.removeFauxMise);

  if (!currentUser) {
    return <LoginForm />;
  }

  // Active view switcher
  const renderActiveView = () => {
    switch (activeTab) {
      case 'tables':
        return (
          <TablesTab
            onStartGame={(tableId) => setPendingAction({ type: 'startGame', tableId })}
            onEndGame={(gameId) => setPendingAction({ type: 'endGame', gameId })}
            onAddFrame={(gameId) => setPendingAction({ type: 'addFrame', gameId })}
            onManageQueue={(tableId) => setPendingAction({ type: 'manageQueue', tableId })}
            onAddToQueue={(tableId) => setPendingAction({ type: 'addToQueue', tableId })}
            onOpenTvPanel={(tableId) => setPendingAction({ type: 'tvDisplay', tableId })}
          />
        );
      case 'cashier':
        return (
          <CashierTab
            onOpenShift={(startingJetons, startingCash) => openShift(startingJetons, startingCash)}
            onCloseShift={(shiftId) => setPendingAction({ type: 'closeShift', shiftId })}
            onAddJetons={() => setPendingAction({ type: 'addJetons' })}
            onSellJetons={() => setPendingAction({ type: 'sellJetons' })}
            onAddFauxMise={() => setPendingAction({ type: 'addFauxMise' })}
            onRemoveFauxMise={(fmId) => {
              if (window.confirm('Supprimer cette faux mise?')) {
                removeFauxMise(fmId);
              }
            }}
          />
        );
      case 'players':
        return (
          <PlayersTab
            onOpenProfile={(playerId) => setPendingAction({ type: 'openProfile', playerId })}
            onOpenPay={(playerId) => setPendingAction({ type: 'pay', playerId })}
            onOpenSMS={(playerId) => setPendingAction({ type: 'sms', playerId })}
            onAddPlayer={() => setPendingAction({ type: 'addPlayer' })}
          />
        );
      case 'playhistory':
        return (
          <PlayHistoryTab
            onEditGame={(gameId) => setPendingAction({ type: 'editGame', gameId })}
          />
        );
      case 'history':
        return (
          <HistoryTab
            onEditGame={(gameId) => setPendingAction({ type: 'editGame', gameId })}
          />
        );
      case 'staff':
        return (
          <StaffTab
            onAddStaff={() => setPendingAction({ type: 'addStaff' })}
            onEditStaff={(staffId) => setPendingAction({ type: 'editStaff', staffId })}
          />
        );
      case 'shifts':
        return <ShiftsHistoryTab />;
      case 'reports':
        return <ReportsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return (
          <TablesTab
            onStartGame={(tableId) => setPendingAction({ type: 'startGame', tableId })}
            onEndGame={(gameId) => setPendingAction({ type: 'endGame', gameId })}
            onAddFrame={(gameId) => setPendingAction({ type: 'addFrame', gameId })}
            onManageQueue={(tableId) => setPendingAction({ type: 'manageQueue', tableId })}
            onAddToQueue={(tableId) => setPendingAction({ type: 'addToQueue', tableId })}
            onOpenTvPanel={(tableId) => setPendingAction({ type: 'tvDisplay', tableId })}
          />
        );
    }
  };

  const actionKey = pendingAction ? `${pendingAction.type}-${pendingAction.tableId || pendingAction.gameId || pendingAction.playerId || pendingAction.staffId || ''}` : 'none';

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveView()}

      {/* Global Modals */}
      <StartGameModal key={`start-${actionKey}`} />
      <EndGameModal key={`end-${actionKey}`} />
      <AddFrameModal key={`frame-${actionKey}`} />
      <PaymentModal key={`pay-${actionKey}`} />
      <QueueModal key={`queue-${actionKey}`} />
      <TVDisplayModal key={`tv-${actionKey}`} />
      <CloseShiftModal key={`shift-${actionKey}`} />
      {pendingAction?.type === 'openProfile' && (
        <PlayerProfileModal
          key={`profile-${actionKey}`}
          playerId={pendingAction.playerId}
          onClose={() => setPendingAction(null)}
          onOpenPay={(pid) => setPendingAction({ type: 'pay', playerId: pid })}
          onOpenSMS={(pid) => setPendingAction({ type: 'sms', playerId: pid })}
          onOpenAdvance={(pid) => setPendingAction({ type: 'advance', playerId: pid })}
          onEditPlayer={(pid) => setPendingAction({ type: 'editPlayer', playerId: pid })}
        />
      )}
      <AddFauxMiseModal key={`faux-${actionKey}`} />
      <SellJetonsModal key={`sell-${actionKey}`} />
      <AddJetonsModal key={`addjetons-${actionKey}`} />
      <EditGameModal key={`editgame-${actionKey}`} />
      <StaffModal key={`staff-${actionKey}`} />
      <PlayerModal key={`player-${actionKey}`} />
    </DashboardLayout>
  );
}

export default App;
