const Bucket = require("@spica-devkit/bucket");

/*
// INSERT
{
  kind: 'insert',
  bucket: '6102cc1afeda1d002d66e670',
  documentKey: '6103ef75feda1d002d66e6a0',
  current: { title: 'book', _id: '6103ef75feda1d002d66e6a0' }
}

// UPDATE
{
  kind: 'update',
  bucket: '6102cc1afeda1d002d66e670',
  documentKey: '6103f005feda1d002d66e6a9',
  previous: { _id: '6103f005feda1d002d66e6a9', title: 'book' },
  current: { title: 'booka', _id: '6103f005feda1d002d66e6a9' }
}

// DELETE
{
  kind: 'delete',
  bucket: '6102cc1afeda1d002d66e670',
  documentKey: '6103ef75feda1d002d66e6a0',
  previous: { _id: '6103ef75feda1d002d66e6a0', title: 'book' }
}
*/

const API_KEY = process.env.API_KEY;

export async function slugCreator(trigger_data) {
  let field_name = "title";
  let slug_field_name = "slug";

  // stop- if data deleted
  if (trigger_data.kind == "delete") {
    return true;
  }

  // stop- if in update state but field didn't change
  if (
    trigger_data.kind == "update" &&
    trigger_data.previous[`${field_name}`] ==
      trigger_data.current[`${field_name}`]
  ) {
    return true;
  }

  // stop- if field is not valid to create a slug
  if (
    trigger_data.current[`${field_name}`] == undefined ||
    trigger_data.current[`${field_name}`] == null ||
    trigger_data.current[`${field_name}`] == ""
  ) {
    return true;
  }

  Bucket.initialize({ apikey: API_KEY });
  let all_data = await Bucket.data
    .getAll(`${trigger_data.bucket}`, {})
    .catch((error) => console.log("err:", error));

  let field_data = trigger_data.current[`${field_name}`];
  let slug = makeSlug(field_data);

  let slug_is_duplicate = isDuplicate(all_data, slug, slug_field_name);

  while (slug_is_duplicate == true) {
    let random_number = Math.floor(100 + Math.random() * 900);
    field_data = field_data + " " + random_number;
    slug = makeSlug(field_data);
    slug_is_duplicate = isDuplicate(all_data, slug, slug_field_name);
  }

  trigger_data.current[`${slug_field_name}`] = slug;

  await Bucket.data
    .update(
      `${trigger_data.bucket}`,
      trigger_data.documentKey,
      trigger_data.current
    )
    .catch((error) => {
      console.log("err: ", error);
    });

  return true;
}

function makeSlug(str) {
  var from =
    "а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я ā ą ä á à â å č ć ē ę ě é è ê æ ģ ğ ö ó ø ǿ ô ő ḿ ŉ ń ṕ ŕ ş ü ß ř ł đ þ ĥ ḧ ī ï í î ĵ ķ ł ņ ń ň ř š ś ť ů ú û ứ ù ü ű ū ý ÿ ž ź ż ç є ґ ə".split(
      " "
    );
  var to =
    "a b v g d e e zh z i y k l m n o p r s t u f h ts ch sh shch # y # e yu ya a a ae a a a a c c e e e e e e e g g oe o o o o o m n n p r s ue ss r l d th h h i i i i j k l n n n r s s t u u u u u u u u y y z z z c ye g e".split(
      " "
    );

  str = str.toLowerCase();

  // remove simple HTML tags
  str = str.replace(/(<[a-z0-9\-]{1,15}[\s]*>)/gi, "");
  str = str.replace(/(<\/[a-z0-9\-]{1,15}[\s]*>)/gi, "");
  str = str.replace(/(<[a-z0-9\-]{1,15}[\s]*\/>)/gi, "");

  str = str.replace(/^\s+|\s+$/gm, ""); // trim spaces

  for (let i = 0; i < from.length; ++i) str = str.split(from[i]).join(to[i]);

  // Replace different kind of spaces with dashes
  var spaces = [
    /(&nbsp;|&#160;|&#32;)/gi,
    /(&mdash;|&ndash;|&#8209;)/gi,
    /[(_|=|\\|\,|\.|!)]+/gi,
    /\s/gi,
  ];

  for (let i = 0; i < from.length; ++i) str = str.replace(spaces[i], "-");
  str = str.replace(/-{2,}/g, "-");

  // remove special chars like &amp;
  str = str.replace(/&[a-z]{2,7};/gi, "");
  str = str.replace(/&#[0-9]{1,6};/gi, "");
  str = str.replace(/&#x[0-9a-f]{1,6};/gi, "");

  str = str.replace(/[^a-z0-9\-]+/gim, ""); // remove all other stuff
  str = str.replace(/^\-+|\-+$/gm, ""); // trim edges

  return str;
}

function isDuplicate(all_data, slug, slug_field_name) {
  let is_duplicate = all_data.some(function (data) {
    return data[`${slug_field_name}`] == slug;
  });

  return is_duplicate;
}
