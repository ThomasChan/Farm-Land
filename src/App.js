import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from './Auth';
import FarmLand from './Land';
import FarmLandBMap from './Land-BMap';

const queryClient = new QueryClient();

export default function App() {
  return <QueryClientProvider client={queryClient}>
    <Auth>
      {window.MapType === 'BingMap' ? <FarmLand /> : <FarmLandBMap />}
    </Auth>
  </QueryClientProvider>;
}
