import { useEffect, useState } from "react";
import { api, message } from "./api";
export function useQuery<T>(url: string, refresh = 0) {
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
  }>({ data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        const response = await api.get<T>(url, { signal: controller.signal });
        if (!controller.signal.aborted)
          setState({ data: response.data, error: "", loading: false });
      } catch (e) {
        if (!controller.signal.aborted)
          setState({ data: null, error: message(e), loading: false });
      }
    }
    void load();
    return () => controller.abort();
  }, [url, refresh]);
  return state;
}
