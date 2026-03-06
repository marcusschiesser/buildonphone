'use client';

import { useEffect, useState } from 'react';
import { IonAlert, IonButton } from '@ionic/react';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';
import { getSelectedModelPreference, setSelectedModelPreference } from '@/lib/model-selection';
import { getServerConfig } from '@/lib/server-config';

export function GenerationModelControl() {
  const [enabled, setEnabled] = useState(false);
  const [defaultModel, setDefaultModel] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [draftModel, setDraftModel] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const config = await getServerConfig({ refresh: true });
      if (cancelled) return;

      setEnabled(config.generationModelOverrideEnabled);
      setDefaultModel(config.defaultModel);

       if (!config.generationModelOverrideEnabled) {
        setSelectedModelPreference('');
        setSelectedModel(config.defaultModel);
        setDraftModel(config.defaultModel);
        return;
      }

      const preferred = getSelectedModelPreference();
      const nextModel = preferred || config.defaultModel;
      setSelectedModel(nextModel);
      setDraftModel(nextModel);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <IonButton
        size="small"
        fill="clear"
        color={selectedModel === defaultModel ? 'medium' : 'primary'}
        title={`Generation model: ${selectedModel || defaultModel}`}
        aria-label={`Generation model: ${selectedModel || defaultModel}`}
        onClick={() => {
          setDraftModel(selectedModel || defaultModel);
          setOpen(true);
        }}
      >
        Model
      </IonButton>
      <IonAlert
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        header="Generation Model"
        message={`Default model: ${defaultModel}`}
        inputs={[
          {
            name: 'model',
            type: 'text',
            placeholder: defaultModel,
            value: draftModel || defaultModel,
          },
        ]}
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Default',
            handler: () => {
              setSelectedModelPreference('');
              setSelectedModel(defaultModel);
              captureAnalyticsEvent('generation_model_selected', {
                model: defaultModel,
                source: 'reset_default',
              });
            },
          },
          {
            text: 'Save',
            handler: (values) => {
              const nextModel = typeof values?.model === 'string' ? values.model.trim() : '';
              const resolvedModel = nextModel || defaultModel;
              setSelectedModelPreference(resolvedModel === defaultModel ? '' : resolvedModel);
              setSelectedModel(resolvedModel);
              captureAnalyticsEvent('generation_model_selected', {
                model: resolvedModel,
                source: 'toolbar',
              });
            },
          },
        ]}
      />
    </>
  );
}
