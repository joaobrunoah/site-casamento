import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

interface ConfigContextType {
  showConfirmationForm: boolean;
  showGiftsList: boolean;
  loading: boolean;
  updateShowConfirmationForm: (value: boolean) => Promise<void>;
  updateShowGiftsList: (value: boolean) => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showConfirmationForm, setShowConfirmationForm] = useState<boolean>(false);
  const [showGiftsList, setShowGiftsList] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshConfig = async () => {
    try {
      const url = getApiUrl('getConfig');
      const response = await fetch(url);
      const result = await response.json();
      if (result.success && result.config) {
        setShowConfirmationForm(result.config['show-confirmation-form'] || false);
        setShowGiftsList(result.config['show-gifts-list'] || false);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateShowConfirmationForm = async (value: boolean) => {
    try {
      const url = getApiUrl('updateConfig');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 'show-confirmation-form': value }),
      });
      const result = await response.json();
      if (result.success) {
        setShowConfirmationForm(value);
      } else {
        throw new Error(result.error || 'Failed to update config');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  };

  const updateShowGiftsList = async (value: boolean) => {
    try {
      const url = getApiUrl('updateConfig');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 'show-gifts-list': value }),
      });
      const result = await response.json();
      if (result.success) {
        setShowGiftsList(value);
      } else {
        throw new Error(result.error || 'Failed to update config');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ showConfirmationForm, showGiftsList, loading, updateShowConfirmationForm, updateShowGiftsList, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
