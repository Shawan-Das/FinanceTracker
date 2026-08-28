export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3"></div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
