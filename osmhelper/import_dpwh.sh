docker exec \
  osmhelper_postgis_1 \
  ogr2ogr \
  -f "PostgreSQL" PG:"port=5444 dbname=postgres user=postgres" "/opt/project/raw_national_bridges_dataset_dpwh-rbi-2022-019.geojson" \
  -nln \
  public.dpwh

