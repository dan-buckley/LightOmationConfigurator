interface ErrorMessageProps {
  message: string;
  detail?: unknown;
}

export function ErrorMessage({ message, detail }: ErrorMessageProps) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">{message}</p>
      {detail != null && (
        <pre className="mt-2 whitespace-pre-wrap text-xs text-red-600">
          {JSON.stringify(detail, null, 2)}
        </pre>
      )}
    </div>
  );
}
