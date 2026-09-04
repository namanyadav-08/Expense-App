import { Toaster } from 'react-hot-toast'

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#101828',
          color: '#fff',
          fontSize: '14px',
          borderRadius: '10px',
          padding: '10px 16px',
        },
        success: { iconTheme: { primary: '#fff', secondary: '#101828' } },
        error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
      }}
    />
  )
}