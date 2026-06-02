import { Navigate, useParams } from 'react-router-dom';
import { getShopPublicPath } from '../lib/shopUrl';

export default function LegacyOrderRedirect() {
  const { shopSlug } = useParams();
  return <Navigate to={getShopPublicPath(shopSlug)} replace />;
}
