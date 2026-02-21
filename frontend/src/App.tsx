import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './providers/ThemeProvider'
import AppLayout from './layouts/AppLayout'
import ProjectListPage from './pages/ProjectListPage'
import ProjectHomePage from './pages/ProjectHomePage'
import WorkbookPage from './pages/WorkbookPage'
import DatasetDetailPage from './pages/DatasetDetailPage'
import ConnectionDetailPage from './pages/ConnectionDetailPage'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/projects" />} />
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/:projectId" element={<ProjectHomePage />} />
            <Route path="/projects/:projectId/datasets/:datasetId" element={<DatasetDetailPage />} />
            <Route path="/projects/:projectId/connections/:connectionId" element={<ConnectionDetailPage />} />
          </Route>
          {/* Workbook gets its own layout (full screen, no sidebar nav) */}
          <Route path="/projects/:projectId/workbooks/:workbookId" element={
            <ThemeProvider>
              <WorkbookPage />
            </ThemeProvider>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
