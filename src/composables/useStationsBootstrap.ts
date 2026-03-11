import { onMounted } from "vue";
import { useFuelStationsStore } from "@/stores/fuelStations";

export const useStationsBootstrap = () => {
  const stationStore = useFuelStationsStore();

  onMounted(() => {
    void stationStore.initialize();
  });

  return stationStore;
};
