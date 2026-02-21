import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppProvider } from '@shopify/polaris'
import enTranslations from '@shopify/polaris/locales/en.json'
import { WorkbookProvider } from '../providers/WorkbookProvider'
import WorkbookFrame from '../components/workbook/WorkbookFrame'
import { useTheme } from '../providers/ThemeProvider'

export default function WorkbookPage() {
  const { projectId, workbookId } = useParams<{ projectId: string; workbookId: string }>()
  const { colorScheme } = useTheme()
  const navigate = useNavigate()

  return (
    <AppProvider i18n={enTranslations}>
      <div data-polaris-color-scheme={colorScheme} style={{ height: '100%' }}>
        <WorkbookProvider projectId={projectId} workbookId={workbookId}>
          <WorkbookFrame
            onBack={() => navigate(`/projects/${projectId}`)}
            projectId={projectId}
          />
        </WorkbookProvider>
      </div>
    </AppProvider>
  )
}
