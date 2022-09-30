# osmhelper
To get better insight into the data, I wrote osmhelper.
I wrote it in a very short time, please let me know if its broken
For now i only tested it on Ubuntu 22.10

# Prerequisites
- Docker
- Docker-compose
- nodejs (i think 16+ is safe)
- npm or yarn

# Configuration
- [osmhelper/.env](osmhelper/.env) contains settings that can be changed.
- [osmhelper/bridges_mapping.yaml](osmhelper/bridges_mapping.yaml) contains the imposm mapping that produces the postgres tables from the OSM data

# How to get it working
1. Clone this repo from github
2. Run `npm install` or `yarn` to install dependencies
3. Run `yarn osmhelper:start`
   - This can take a while, it will download docker images and start everything
4. Run `yarn osmhelper:download`
   - This downloads the PBF file for philippines into [osmhelper/data/](osmhelper/data/)
5. Run `yarn osmhelper:imposm`
   - This imports the OSM data into postgres, using the mappings from [osmhelper/bridges_mapping.yaml](osmhelper/bridges_mapping.yaml)
   - All tables go into the **public** database, for convenience.
6. Run `yarn import:dpwh`
   - Imports [raw_national_bridges_dataset_dpwh-rbi-2022-019.geojson](raw_national_bridges_dataset_dpwh-rbi-2022-019.geojson) into postgres using ogr2ogr
7. Run `yarn generate`
   - Runs the [osmhelper/generate.js](osmhelper/generate.js) script. Feel free to read/modify.
   - Right now outputs to a TSV file: [osmhelper/tmp.tsv](osmhelper/tmp.tsv) that I then imported into googlesheets

# And then what can I do?
- Go to [http://localhost:8081](http://localhost:8081) to view the postgres database in the browser
- Improve the **osmhelper/generate.js** script to get better output
- Or of course, write your own scripts!

# Tools used / inspiration
- [https://postgis.net/](postgis) for all the database tooling
- [https://github.com/sosedoff/pgweb](pgweb) for the web-based db viewer
- [https://imposm.org/docs/imposm3/latest/tutorial.html#importing](imposm3) for the import tooling
- [https://gdal.org/drivers/vector/pg.html](ogr2ogr) for the geojson->postgres import tooling
- [https://github.com/openmaptiles/openmaptiles-tools](openmaptiles-tools) for inspiration to setup the tooling


