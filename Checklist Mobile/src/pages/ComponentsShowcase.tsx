import React, { useState } from 'react';
import {
  EnhancedCard,
  StatusCard,
  SwipeableCard,
  FloatingLabelInput,
  ModernButton,
  Toast,
  useToast,
  AnimatedBadge,
  SkeletonCard,
  SkeletonList,
  SkeletonForm
} from '../components';
import { 
  CheckSquare, 
  Package, 
  Settings, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

// Local ToastContainer component to render toasts from useToast()
const ToastContainer: React.FC<{ toasts: any[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts?.map((t: any) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          isVisible={t.isVisible}
          onClose={() => onClose(t.id)}
        />
      ))}
    </div>
  )
}

const ComponentsShowcase: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: ''
  });

  const { toasts, showToast, hideToast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Simple validation
    if (field === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setFormErrors(prev => ({ ...prev, email: 'Email inválido' }));
      } else {
        setFormErrors(prev => ({ ...prev, email: '' }));
      }
    }
    
    if (field === 'name' && value.length < 3) {
      setFormErrors(prev => ({ ...prev, name: 'Nome deve ter pelo menos 3 caracteres' }));
    } else if (field === 'name') {
      setFormErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleCardClick = (title: string) => {
    showToast(`Cartão "${title}" clicado!`, 'info');
  };

  const handleSwipeLeft = (title: string) => {
    showToast(`Cartão "${title}" deslizado para esquerda!`, 'warning');
  };

  const handleSwipeRight = (title: string) => {
    showToast(`Cartão "${title}" deslizado para direita!`, 'success');
  };

  const handleButtonClick = (variant: string) => {
    showToast(`Botão ${variant} clicado!`, 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-display text-center mb-8 text-gray-900">
          Interface Melhorada
        </h1>

        {/* Enhanced Cards Section */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Cartões Aprimorados</h2>
          
          <EnhancedCard
            title="Checklist Diário"
            description="Gerencie seus checklists diários com facilidade"
            icon={CheckSquare}
            onClick={() => handleCardClick('Checklist Diário')}
            variant="default"
          />
          
          <EnhancedCard
            title="Equipamentos"
            description="Visualize e gerencie seus equipamentos"
            icon={Package}
            onClick={() => handleCardClick('Equipamentos')}
            variant="success"
          />
          
          <EnhancedCard
            title="Configurações"
            description="Ajuste as configurações do aplicativo"
            icon={Settings}
            onClick={() => handleCardClick('Configurações')}
            variant="warning"
          />
        </section>

        {/* Status Cards Section */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Status Cards</h2>
          
          <StatusCard
            title="Conexão"
            status="online"
            description="Conectado ao servidor"
          />
          
          <StatusCard
            title="Sincronização"
            status="syncing"
            description="Sincronizando dados..."
          />
          
          <StatusCard
            title="Erro de Conexão"
            status="error"
            description="Falha na conexão com o servidor"
          />
        </section>

        {/* Swipeable Cards Section */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Cartões Deslizáveis</h2>
          <p className="text-caption text-gray-600 mb-4">
            Deslize para os lados para ver as ações
          </p>
          
          <SwipeableCard
            title="Tarefa 1"
            description="Esta é uma tarefa que pode ser deslizada"
            icon={CheckSquare}
            onSwipeLeft={() => handleSwipeLeft('Tarefa 1')}
            onSwipeRight={() => handleSwipeRight('Tarefa 1')}
            variant="default"
          />
          
          <SwipeableCard
            title="Tarefa 2"
            description="Outra tarefa com ações deslizantes"
            icon={AlertTriangle}
            onSwipeLeft={() => handleSwipeLeft('Tarefa 2')}
            onSwipeRight={() => handleSwipeRight('Tarefa 2')}
            variant="warning"
          />
        </section>

        {/* Form Components Section */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Formulários Modernos</h2>
          
          <FloatingLabelInput
            label="Nome Completo"
            type="text"
            value={formData.name}
            onChange={(value) => handleInputChange('name', value)}
            error={formErrors.name}
            success={formData.name.length >= 3 && !formErrors.name}
            required
          />
          
          <FloatingLabelInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
            error={formErrors.email}
            success={formData.email && !formErrors.email}
            required
          />
          
          <FloatingLabelInput
            label="Telefone"
            type="tel"
            value={formData.phone}
            onChange={(value) => handleInputChange('phone', value)}
          />
          
          <FloatingLabelInput
            label="Data"
            type="date"
            value={formData.date}
            onChange={(value) => handleInputChange('date', value)}
          />
        </section>

        {/* Modern Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Botões Modernos</h2>
          
          <ModernButton
            variant="primary"
            onClick={() => handleButtonClick('Primário')}
            fullWidth
          >
            Botão Primário
          </ModernButton>
          
          <ModernButton
            variant="success"
            onClick={() => handleButtonClick('Sucesso')}
            fullWidth
          >
            Botão Sucesso
          </ModernButton>
          
          <ModernButton
            variant="warning"
            onClick={() => handleButtonClick('Aviso')}
            fullWidth
          >
            Botão Aviso
          </ModernButton>
          
          <ModernButton
            variant="error"
            onClick={() => handleButtonClick('Erro')}
            fullWidth
          >
            Botão Erro
          </ModernButton>
          
          <div className="grid grid-cols-2 gap-2">
            <ModernButton
              variant="secondary"
              onClick={() => handleButtonClick('Secundário')}
              size="sm"
            >
              Secundário
            </ModernButton>
            
            <ModernButton
              variant="ghost"
              onClick={() => handleButtonClick('Ghost')}
              size="sm"
            >
              Ghost
            </ModernButton>
          </div>
        </section>

        {/* Animated Badges Section */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Badges Animadas</h2>
          
          <div className="flex flex-wrap gap-2">
            <AnimatedBadge
              type="status"
              variant="default"
              icon={Info}
            />
            
            <AnimatedBadge
              type="status"
              variant="success"
              icon={CheckCircle}
              pulse={true}
            />
            
            <AnimatedBadge
              type="status"
              variant="warning"
              icon={AlertTriangle}
              bounce={true}
            />
            
            <AnimatedBadge
              type="status"
              variant="error"
              icon={AlertTriangle}
              pulse={true}
            />
            
            <AnimatedBadge
              type="sync"
              count={5}
              pulse={true}
              bounce={true}
            />
            
            <AnimatedBadge
              type="notification"
              count={12}
              pulse={true}
            />
          </div>
        </section>

        {/* Skeleton Loading Section */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Skeleton Loading</h2>
          
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonList count={2} />
            <SkeletonForm />
          </div>
        </section>

        {/* Toast Notifications Demo */}
        <section className="space-y-4">
          <h2 className="text-heading text-gray-800">Toast Notifications</h2>
          
          <div className="grid grid-cols-2 gap-2">
            <ModernButton
              variant="success"
              onClick={() => showToast('Operação realizada com sucesso!', 'success')}
              size="sm"
            >
              Sucesso
            </ModernButton>
            
            <ModernButton
              variant="error"
              onClick={() => showToast('Ocorreu um erro!', 'error')}
              size="sm"
            >
              Erro
            </ModernButton>
            
            <ModernButton
              variant="warning"
              onClick={() => showToast('Atenção! Verifique os dados.', 'warning')}
              size="sm"
            >
              Aviso
            </ModernButton>
            
            <ModernButton
              variant="primary"
              onClick={() => showToast('Informação importante!', 'info')}
              size="sm"
            >
              Info
            </ModernButton>
          </div>
        </section>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
};

export default ComponentsShowcase;
