require("dotenv").config({path: process.cwd() + "/.env"});

// iD link
// https://github.com/openstreetmap/iD/blob/develop/API.md

const db = require("osmhelper/db");
const fs = require("fs-extra");

async function doIt() {
    await db.query(`
        drop table if exists dpwh;
        create table dpwh
        (
            id             varchar
                primary key,
            province       varchar,
            operator       varchar,
            road_name      varchar,
            name           varchar,
            length         double precision,
            material       varchar,
            start_date     integer,
            width          double precision,
            max_weight     double precision,
            max_height     double precision,
            height_over    double precision,
            height_under   double precision,
            left_sidewalk  double precision,
            right_sidewalk double precision,
            lanes          integer,
            barangay       varchar,
            municipality   varchar,
            designation    varchar,
            "ref"          integer,
            geometry       geometry(Point, 4326)
        );
        CREATE INDEX IF NOT EXISTS dpwh_geometry_index ON dpwh USING gist ((geometry::geography));
    `);

    const rows = (
        await db.query(`
            SELECT d.bridge_id      as id,
                   d.br_name        as name,
                   d.road_name,
                   d.province,
                   d.brgy           as barangay,
                   d.mun            as municipality,
                   d.br_length      as length,
                   d.br_width       as width,
                   d.load_limit     as max_weight,
                   d.ht_under       as max_height,
                   d.ht_over        as height_over,
                   d.ht_under       as height_under,
                   d.l_sdwalk       as left_sidewalk,
                   d.r_sdwalk       as right_sidewalk,
                   d.num_lanes      as lanes,
                   d.road_sec_class as designation,
                   d.route_no       as ref,
                   d.br_type1       as material,
                   d.actual_yr      as start_date,
                   d.deo            as operator,
                   d.wkb_geometry   as geometry,
                   ST_AsGeoJSON(
                           ST_Envelope(
                                   ST_Buffer(d.wkb_geometry, 0.002)
                               ))   as "bbox"
            FROM dpwh_raw d
            where d.wkb_geometry is not null
            ;

        `)
    ).rows;

    let tsv = Object.keys(rows[0]).slice(0, -2).join('\t').concat('\tjosm')


    for (const row of rows) {


        if (row.name.indexOf("(Cantilever")) {
            row["bridge"] = "cantilever"
            row.name = row.name
                .replace("(Cantilever)", "")
                .replace("(Cantilevered)", "")
        } else {
            row["bridge"] = ""
        }

        row.name = cleanName(row.name)
        row.barangay = cleanBarangay(row.barangay)
        row.municipality = cleanMunicipality(row.municipality)


        const query = `INSERT INTO dpwh
                       SELECT *
                       FROM json_populate_record(NULL::dpwh, $1)
        ;`

        await db.query(query, [row])

        row["josm"] = createJosmLink(row.bbox)


        tsv = tsv
            .concat("\n")
            .concat([
                    row["id"],
                    row["name"],
                    row["road_name"],
                    row["province"],
                    row["barangay"],
                    row["municipality"],
                    row["length"],
                    row["width"],
                    row["max_weight"],
                    row["max_height"],
                    row["height_over"],
                    row["height_under"],
                    row["left_sidewalk"],
                    row["right_sidewalk"],
                    row["lanes"],
                    row["designation"],
                    row["ref"],
                    row["material"],
                    row["start_date"],
                    row["operator"],
                    row["josm"]
                ].join("\t"),
            )
        // console.log(tsv)
    }
    await fs.writeFileSync("dpwh.tsv", tsv);
}

function createJosmLink(bbox) {
    const boxCoords = JSON.parse(bbox).coordinates[0];

    const url = new URL("http://127.0.0.1:8111/load_and_zoom");
    url.searchParams.set("left", boxCoords[0][0]);
    url.searchParams.set("right", boxCoords[2][0]);
    url.searchParams.set("top", boxCoords[1][1]);
    url.searchParams.set("bottom", boxCoords[0][1]);

    return url.toString();
    //
    // const addtagUrl = new URL("http://127.0.0.1:8111/load_and_zoom");
    // addtagUrl.searchParams.set("left", boxCoords[0][0]);
    // addtagUrl.searchParams.set("right", boxCoords[2][0]);
    // addtagUrl.searchParams.set("top", boxCoords[1][1]);
    // addtagUrl.searchParams.set("bottom", boxCoords[0][1]);
    // addtagUrl.searchParams.set("addtags", "bla=ba|kaka=ya");
    // addtagUrl.searchParams.set("select", "currentselection");
    //
    // row["addtag"] = (addtagUrl.toString());
}

function cleanName(str) {
    return str
        .replaceAll('Br.', 'Bridge')
        .replace('(NB)', ' (Northbound)')
        .replace(' NB)', ' Northbound)')
        .replace('NB)', ' Northbound)')
        .replace(' NB ', ' Northbound ')
        .replace('(SB)', '(Southbound)')
        .replace(' SB ', ' Southbound ')
        .replace('(WB)', '(Westbound)')
        .replace(' WB ', ' Westbound ')
        .replace('(EB)', '(Eastbound)')
        .replace(' EB ', ' Eastbound ')
        .replace('Gov. ', 'Governor ')
        .replace('Arch Reyes', 'Archbishop Reyes')
        .replace(/(.*)( \d)/g, "$1 №$2")
        .replace('  ', ' ')
        .replace('  ', ' ')
        .replace('( ', '(')
}

function cleanMunicipality(str) {
    return str
        .replace(/\s+/g, ' ').trim()
        .replace(/$\s(.*)/, "$1")
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.substring(1))
        .join(' ')
        .replace('Sta.', 'Santa')
        .replace('Sta ', 'Santa ')
        .replace('Zambonga City', 'Zamboanga City')
        .replace("Brookes Point", "Brooke's Point")
        .replace("Brook's Point", "Brooke's Point")
        .replace("Busuanga, Palawan", "Busuanga")
        .replace(", Cebu", "")
        .replace(", Sorsogon City", "")
        .replace(", Ilocos Norte", "")
        .replace(", Rizal", "")
        .replace(",lanao Del Norte", "")
        .replace(", Lanao Del Norte", "")
        .replace(", Agusan Del Sur", "")
        .replace(", Province Of Dinagat Islands", "")
        .replace(", Leyte", "")
        .replace(", N. Samar", "")
        .replace(", Quezon", "")
        .replace(",zds.", "")
        .replace(", Cam. Sur", "")
        .replace(", N Samar", "")
        .replace(",capiz", "")
        .replace(", Ilocos Sur", "")
        .replace(",zamboanga Del Sur", "")
        .replace(", Zamboanga Del Sur", "")
        .replace(" ,tarlac", "")
        .replace(", Albay", "")
        .replace(", Palawan", "")
        .replace(", Northern Samar", "")
        .replace(",tarlac", "")
        .replace(", Zds.", "")
        .replace("Sergio Osmena, Sr.", "Sergio Osmeña")
}

function cleanBarangay(str) {
    return str
        .replace(/\s+/g, ' ').trim()
        .replace(/$\s(.*)/, "$1")
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.substring(1))
        .join(' ')
        .replace('Brgy. ', '')
        .replace('Bgy. ', '')
        .replace('Barangay ', '')
        .replace('Sta.', 'Santa')
        .replace('Sta ', 'Santa ')
        .replace('Sto.', 'Santo')
        .replace('Sto ', 'Santo ')
        .replace('Brgys.', 'Barangays')
        .replace('Brgys.', 'Barangays')
        .replace('Pob.', 'Poblacion')
        .replace('Pobl;acion', 'Poblacion')
        .replace('Herero-perez', 'Herrero-Perez')
        .replace('New Bususnga', 'New Busuanga')
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
