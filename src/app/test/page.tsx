export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Test Page - No Authentication Required
        </h1>
        <p className="text-gray-600 mb-4">
          If you can see this page, the deployment is working correctly.
        </p>
        <div className="text-sm text-gray-500">
          <p>Timestamp: {new Date().toISOString()}</p>
          <p>Environment: Production</p>
        </div>
      </div>
    </div>
  )
} 