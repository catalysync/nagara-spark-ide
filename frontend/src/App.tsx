import { AppProvider } from '@shopify/polaris'
import enTranslations from '@shopify/polaris/locales/en.json'
import { ThemeProvider, useTheme } from './providers/ThemeProvider'
import { WorkbookProvider } from './providers/WorkbookProvider'
import WorkbookFrame from './components/WorkbookFrame'

function AppShell() {
  const { colorScheme } = useTheme()
  return (
    <AppProvider i18n={enTranslations}>
      <div data-polaris-color-scheme={colorScheme}>
        <WorkbookProvider>
          <WorkbookFrame />
        </WorkbookProvider>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}
