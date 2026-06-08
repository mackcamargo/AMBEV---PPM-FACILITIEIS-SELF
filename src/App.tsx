/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './lib/store';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { MaterialMovement } from './views/MaterialMovement';
import { StockView } from './views/StockView';
import { HistoryView } from './views/HistoryView';
import { SelfMeeting } from './views/SelfMeeting';
import { RegistrationView } from './views/Registrations';
import { MeetingHistory } from './views/MeetingHistory';
import { ReportsView } from './views/Reports';
import { Settings } from './views/Settings';
import { WelcomeView } from './views/WelcomeView';

function AppContent() {
  const { view, setView, hasEntered, setHasEntered } = useApp();

  const handleEnter = (targetView: 'dashboard' | 'retirada-materiais' | 'reuniao-self') => {
    setView(targetView);
    setHasEntered(true);
  };

  if (!hasEntered) {
    return <WelcomeView onEnter={handleEnter} />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard />;
      case 'entrada-materiais': return <MaterialMovement key="entrada" type="Entrada" />;
      case 'retirada-materiais': return <MaterialMovement key="retirada" type="Retirada" />;
      case 'estoque-atual': return <StockView />;
      case 'movimentacoes': return <HistoryView />;
      case 'reuniao-self': return <SelfMeeting />;
      case 'cad-materiais': return <RegistrationView type="materiais" />;
      case 'cad-empresas': return <RegistrationView type="empresas" />;
      case 'cad-fornecedores': return <RegistrationView type="fornecedores" />;
      case 'cad-colaboradores': return <RegistrationView type="colaboradores" />;
      case 'cad-equipes': return <RegistrationView type="equipes" />;
      case 'historico-reunioes': return <MeetingHistory />;
      case 'relatorios': return <ReportsView />;
      case 'configuracoes': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
