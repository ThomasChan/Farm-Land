import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from './Auth';
import FarmLand from './Land';

const queryClient = new QueryClient();

export default function App() {
  return <QueryClientProvider client={queryClient}>
    <Auth>
      <FarmLand />
    </Auth>
  </QueryClientProvider>;
}
