require("dotenv").config({ path: process.cwd() + "/.env" });

// iD link
// https://github.com/openstreetmap/iD/blob/develop/API.md

const db = require("osmhelper/db");
const fs = require("fs-extra");

async function doIt() {
  await db.query(`
        CREATE INDEX IF NOT EXISTS dpwh_geom_index ON dpwh USING gist ((wkb_geometry::geography));
        CREATE INDEX IF NOT EXISTS bridge_linestring_geom_index ON bridge_linestring USING gist ((geometry::geography));
        create unique index IF NOT EXISTS dpwh_bridge_id_uindex on dpwh (bridge_id);
    `);

  const rows = (
    await db.query(`
            SELECT d.bridge_id,
                   d.br_name,
                   d.road_name,
                   d.province,
                   d.br_length,
                   d.br_width,
                   d.load_limit,
                   d.br_type1,
                   d.actual_yr,
                    COUNT(h.osm_id) as "osm_count",
                   json_agg(h.osm_id) as "osm",
                   ST_AsGeoJSON(
                           ST_Envelope(
                                   ST_Buffer(d.wkb_geometry, 0.002)
                               ))     as "envelope"
            FROM dpwh d
                     LEFT JOIN bridge_linestring h
                               ON ST_DWithin(d.wkb_geometry, h.geometry, 200, false)
            where d.wkb_geometry is not null
            GROUP BY d.ogc_fid
            ;
        `)
  ).rows;
  let selectcounter = 1;
  let tsv = [
    "bridge_id",
    "name",
    "road_name",
    "province",
    "length",
    "width",
    "loadlimit",
    "type",
    "actual_yr",
    "osm_count",
    "osm_ids",
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
    `josm_${selectcounter++}`,
  ].join("\t");

  for (const row of rows) {
    const boxCoords = JSON.parse(row.envelope).coordinates[0];

    const josmSelect = [];

    for (const osm of row.osm) {
      const url = new URL("http://127.0.0.1:8111/load_and_zoom");
      url.searchParams.set("left", boxCoords[0][0]);
      url.searchParams.set("right", boxCoords[2][0]);
      url.searchParams.set("top", boxCoords[1][1]);
      url.searchParams.set("bottom", boxCoords[0][1]);

      url.searchParams.set("select", `way${osm}`);
      if (osm != null) josmSelect.push(url.toString());
    }

    tsv = tsv
      .concat("\n")
      .concat(
        [
          row.bridge_id,
          row.br_name,
          row.road_name,
          row.province,
          row.br_length,
          row.br_width,
          row.loadlimit,
          row.br_type1,
          row.actual_yr,
          row.osm_count,
          `"${row.osm.join("\n")}"`,
          `${josmSelect.join("\t")}`,
        ].join("\t")
      );
    // console.log(tsv);
  }
  await fs.writeFileSync("tmp.tsv", tsv);
}

async function main() {
  await doIt();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
