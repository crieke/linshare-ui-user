/**
 * WorkgroupRevisionsController Controller
 * @namespace LinShare.sharedSpace
 */
(function() {
  'use strict';

  angular
    .module('linshare.sharedSpace')
    .config(['$translatePartialLoaderProvider', function($translatePartialLoaderProvider) {
      $translatePartialLoaderProvider.addPart('notification');
    }])
    .controller('WorkgroupRevisionsController', WorkgroupRevisionsController);

  WorkgroupRevisionsController.$inject = [
    '$q',
    '$scope',
    '$transition$',
    'toastService',
    'nodesList',
    'workgroupPermissions',
    'currentFolder',
    'workgroup',
    'flowUploadService',
    'tableParamsService',
    'workgroupRevisionsRestService'
  ];

  /**
   * @namespace WorkgroupRevisionsController
   * @desc Application revision management system controller
   * @revisionOf LinShare.sharedSpace
   */
  function WorkgroupRevisionsController(
    $q,
    $scope,
    $transition$,
    toastService,
    nodesList,
    workgroupPermissions,
    currentFolder,
    workgroup,
    flowUploadService,
    tableParamsService,
    workgroupRevisionsRestService
  ) {
    var workgroupRevisionsVm = this;

    workgroupRevisionsVm.todo = todo;
    workgroupRevisionsVm.folderDetails = _.cloneDeep($transition$.params());
    workgroupRevisionsVm.upload = upload;
    workgroupRevisionsVm.revisionsList = nodesList;
    workgroupRevisionsVm.permissions = workgroupPermissions;
    workgroupRevisionsVm.tableParamsService = tableParamsService;
    workgroupRevisionsVm.flowUploadService = flowUploadService;
    workgroupRevisionsVm.getNodeDetails = getNodeDetails;
    workgroupRevisionsVm.addUploadedDocument = addUploadedDocument;

    activate();

    function activate() {

      workgroupRevisionsVm.folderDetails.workgroupName = workgroup.name;
      workgroupRevisionsVm.folderDetails.folderName = currentFolder.name;
      workgroupRevisionsVm.folderDetails.folderUuid = currentFolder.uuid;
      workgroupRevisionsVm.folderDetails.quotaUuid = workgroup.quotaUuid;

      launchTableParamsInit();
    }

    function todo(){
      toastService.error({key: 'Please code me!'});
    }


    function launchTableParamsInit() {
      tableParamsService.initTableParams(workgroupRevisionsVm.revisionsList, workgroupRevisionsVm.paramFilter,
        workgroupRevisionsVm.folderDetails.uploadedFileUuid)
        .then(function(data) {
          workgroupRevisionsVm.tableParamsService = tableParamsService;
          workgroupRevisionsVm.tableParams = tableParamsService.getTableParams();
          workgroupRevisionsVm.resetSelectedDocuments = tableParamsService.resetSelectedItems;
          workgroupRevisionsVm.selectedDocuments = tableParamsService.getSelectedItemsList();
          workgroupRevisionsVm.toggleFilterBySelectedFiles = tableParamsService.isolateSelection;
          workgroupRevisionsVm.toggleSelectedSort = tableParamsService.getToggleSelectedSort();
        });
    }

    function getNodeDetails(nodeItem) {
      // TODO : change the watcher method in activate() of workgroupMembersController, then do it better
      $scope.mainVm.sidebar.setContent(workgroupRevisionsVm.workgroupNode);

      return $q
        .all([
          workgroupRevisionsRestService.get(
            workgroupRevisionsVm.folderDetails.workgroupUuid,
            nodeItem.uuid
          ),
          workgroupRevisionsRestService.getAudit(
            workgroupRevisionsVm.folderDetails.workgroupUuid,
            nodeItem.uuid
          )
        ])
        .then(function(workgroupRevisionsRestServiceAnswers) {
          var nodeDetails = workgroupRevisionsRestServiceAnswers[0];
          var nodeAudit = workgroupRevisionsRestServiceAnswers[1];

          return $q.all([
            documentUtilsService.loadItemThumbnail(
              nodeDetails,
              workgroupRevisionsRestService.thumbnail.bind(
                null,
                workgroupRevisionsVm.folderDetails.workgroupUuid,
                nodeItem.uuid
              )
            ),
            auditDetailsService.generateAllDetails(
              $scope.userLogged.uuid,
              nodeAudit.plain()
            ),
          ]);
        })
        .then(function(workgroupRevisionsRestServiceAnswers) {
          var nodeDetails = workgroupRevisionsRestServiceAnswers[0];
          var auditActions = workgroupRevisionsRestServiceAnswers[1];

          return Object.assign(
            {},
            nodeDetails,
            { auditActions: auditActions }
          );
        });
    }


    function addNewItemInTableParams(newItem) {
      workgroupRevisionsVm.revisionsList.push(newItem);
      workgroupRevisionsVm.tableParamsService.reloadTableParams();
    }


    function addUploadedDocument(flowFile) {
      if (flowFile.isRevision === true) {
        if (flowFile.folderDetails.workgroupUuid === workgroupRevisionsVm.folderDetails.workgroupUuid &&
          flowFile.folderDetails.folderUuid === workgroupRevisionsVm.folderDetails.folderUuid) {
          flowFile.asyncUploadDeferred.promise.then(function(file) {
            addNewItemInTableParams(file.linshareDocument);
          });
        }
      }
    }

    function upload(flowFiles, folderDetails) {
      _.forEachRight(flowFiles, function(file) {
        file.isRevision = true;
        file.folderDetails = folderDetails;
      });

      $scope.$flow.upload();
      workgroupRevisionsVm.tableParamsService.reloadTableParams();
    }
  }
})();