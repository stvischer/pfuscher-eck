function map(record) {
  return {
    id: Number(record.relation_id),
    addressId: Number(record.address_id),
    addressType: record.address_type,
    radiusM: record.radius_m != null ? Number(record.radius_m) : null,
    street: record.street ?? null,
    city: record.city ?? null,
    state: record.state ?? null,
    postalCode: record.postal_code ?? null,
    country: record.country ?? null,
    lat: record.lat != null ? Number(record.lat) : null,
    lon: record.lon != null ? Number(record.lon) : null,
  };
}

export default {
  map,
};
