
docker exec \
  osmhelper_postgis_1 \
  psql -U postgres --command "DROP TABLE IF EXISTS dpwh_raw;"

docker exec \
  osmhelper_postgis_1 \
  ogr2ogr \
  -f "PostgreSQL" PG:"user=postgres" "/opt/project/raw_national_bridges_dataset_dpwh-rbi-2022-019.geojson" \
  -nln \
  public.dpwh_raw

docker exec \
  osmhelper_postgis_1 \
  psql -U postgres --command "CREATE INDEX IF NOT EXISTS dpwh_raw_geom_index ON dpwh_raw USING gist ((wkb_geometry::geography));"

docker exec \
  osmhelper_postgis_1 \
  psql -U postgres --command "create unique index IF NOT EXISTS dpwh_raw_bridge_id_uindex on dpwh_raw (bridge_id);"


