import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";

export default function History() {
  const query = useSuspenseQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const response = await fetch("/api/v1/history");
      return response.json();
    },
  });

  return <pre>{JSON.stringify(query.data, null, 2)}</pre>;
}
