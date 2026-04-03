import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on a table and call onUpdate when changes occur.
 */
export const useRealtimeTable = (table: string, onUpdate: () => void) => {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate]);
};
