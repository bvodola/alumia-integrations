const cloudinary = require('cloudinary').v2;
const env = require('./env');

cloudinary.config({ 
  cloud_name: env.CLOUDINARY_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// cloudinary.uploader.upload(`static/reports/${context._client._id}.docx`,
//   {resource_type: 'auto'}, function(error, result) {
//   if(error) {
//     console.log(error)
//     res.sendStatus(500);
//   } else {
//     console.log(result);
//     res.statusCode = 302;
//     res.setHeader("Location", "https://docs.google.com/gview?url="+result.url);
//     res.end();
//   }
// });