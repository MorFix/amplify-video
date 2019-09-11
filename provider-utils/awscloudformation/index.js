const {stageVideo, copyFilesToS3} = require('./utils/video-staging')

let serviceMetadata;

async function addResource(context, service, options) {

    serviceMetadata = context.amplify.readJsonFile(`${__dirname}/../supported-services.json`)[service];
    let { cfnFilename, stackFolder } = serviceMetadata;
    const { serviceWalkthroughFilename, defaultValuesFilename } = serviceMetadata;
    const serviceWalkthroughSrc = `${__dirname}/service-walkthroughs/${serviceWalkthroughFilename}`;
    const {serviceQuestions} = require(serviceWalkthroughSrc);
    const result = await serviceQuestions(context, options, defaultValuesFilename);
    await stageVideo(context, options, result, cfnFilename, stackFolder, 'add');

}

async function updateResource(context, service, options, resourceName){
    serviceMetadata = context.amplify.readJsonFile(`${__dirname}/../supported-services.json`)[service];
    let { cfnFilename, stackFolder } = serviceMetadata;
    const { serviceWalkthroughFilename, defaultValuesFilename } = serviceMetadata;
    const serviceWalkthroughSrc = `${__dirname}/service-walkthroughs/${serviceWalkthroughFilename}`;
    const {serviceQuestions} = require(serviceWalkthroughSrc);
    const result = await serviceQuestions(context, options, defaultValuesFilename, resourceName);
    await stageVideo(context, options, result, cfnFilename, stackFolder, 'update');
}

async function livestreamStartStop(context, service, options, resourceName, start){
    let { cfnFilename, stackFolder } = serviceMetadata;
    const { amplify } = context;
    const amplifyMeta = context.amplify.getProjectMeta();
    serviceMetadata = context.amplify.readJsonFile(`${__dirname}/../supported-services.json`)[service];
    if (amplifyMeta.video[resourceName].output) {
      const targetDir = amplify.pathManager.getBackendDirPath();
      try {
        const props = JSON.parse(fs.readFileSync(`${targetDir}/video/${resourceName}/props.json`));
        if ((props.mediaLive.autoStart === 'YES' && start) || (props.mediaLive.autoStart === 'NO' && start)) {
          props.mediaLive.autoStart = start ? 'YES' : 'NO';
          props.shared.resourceName = resourceName;
          const serviceWalkthroughSrc = `${__dirname}/utils/video-staging.js`;
          const {updateWithProps} = require(serviceWalkthroughSrc);
          updateWithProps(context, options, props, resourceName, cfnFilename, stackFolder);
          amplify.constructExeInfo(context);
          amplify.pushResources(context, 'video', resourceName).catch((err) => {
            context.print.info(err.stack);
            context.print.error('There was an error pushing the video resource');
          });
        } else {
          console.log(chalk`{bold ${resourceName} is already ${start ? 'running' : 'stopped'}.}`);
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      console.log(chalk`{bold You have not pushed ${resourceName} to the cloud yet.}`);
    }
}

async function setupCloudFormation(context, service, options, resourceName){
    serviceMetadata = context.amplify.readJsonFile(`${__dirname}/../supported-services.json`)[service];
    let { stackFolder } = serviceMetadata;
    await copyFilesToS3(context, options, resourceName, stackFolder, 'update');
}


module.exports = {
    addResource,
    updateResource,
    setupCloudFormation,
    livestreamStartStop,
}
