import { ReceptionProvider } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionScreen } from '@/features/reception/ReceptionScreen'

function App() {
  return (
    <ReceptionProvider>
      <ReceptionScreen />
    </ReceptionProvider>
  )
}

export default App
