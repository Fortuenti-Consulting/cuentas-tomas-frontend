import { useState } from 'react'

export const OnboardingTour = () => {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: 'Bienvenido a Cuentas Tomás',
      message: 'Aquí ves lo que debes este mes para la manutención y vestuario de Tomás.',
    },
    {
      title: 'Revisa gastos compartidos',
      message: 'Revisa y aprueba gastos compartidos en la sección de Gastos. Cada gasto se divide entre Ricardo y Catherine.',
    },
    {
      title: 'Registra tus pagos',
      message: 'Registra los pagos que realizas con comprobante de Bancolombia. Todos los movimientos quedan auditados.',
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      localStorage.setItem('onboarded', 'true')
      window.location.reload()
    }
  }

  const handleClose = () => {
    localStorage.setItem('onboarded', 'true')
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{steps[currentStep].title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-gray-600 mb-6">{steps[currentStep].message}</p>

        <div className="flex gap-2 justify-between items-center">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full ${idx <= currentStep ? 'bg-indigo-600' : 'bg-gray-300'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              Omitir
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
            >
              {currentStep === steps.length - 1 ? 'Terminar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
