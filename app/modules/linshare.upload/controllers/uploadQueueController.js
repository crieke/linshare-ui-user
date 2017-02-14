/**
 * Upload queue controller
 * @namespace UploadQueue
 * @memberOf LinShare.upload
 */
(function() {
  'use strict';
  angular
    .module('linshare.upload')
    .controller('uploadQueueController', uploadQueueController);

  uploadQueueController.$inject = ['$mdToast', '$scope', '$state', '$stateParams', '$timeout', '$translate',
    '$translatePartialLoader', 'flowUploadService', 'growlService', 'lsAppConfig'];

  /**
   * @namespace uploadQueueController
   * @desc Controller of all variables and methods for upload queue
   * @memberOf LinShare.upload.uploadQueueController
   */
  function uploadQueueController($mdToast, $scope, $state, $stateParams, $timeout, $translate, $translatePartialLoader,
                                 flowUploadService, growlService, lsAppConfig) {
    /* jshint validthis:true */
    var uploadQueueVm = this;
    var idUpload = $stateParams.idUpload;

    $scope.lengthOfSelectedDocuments = lengthOfSelectedDocuments;
    $scope.resetSelectedDocuments = resetSelectedDocuments;
    $scope.selectedUploads = {};

    // TODO: refactor in services, no mix with declarations below
    uploadQueueVm.lengthOfSelectedDocuments = $scope.lengthOfSelectedDocuments;
    uploadQueueVm.resetSelectedDocuments = $scope.resetSelectedDocuments;
    uploadQueueVm.selectedDocuments = $scope.selectedDocuments;
    uploadQueueVm.selectedUploads = $scope.selectedUploads;

    uploadQueueVm.$flow = $scope.$flow;
    uploadQueueVm.$mdToast = $mdToast;
    uploadQueueVm.cancelAllFiles = cancelAllFiles;
    uploadQueueVm.cancelSelectedFiles = cancelSelectedFiles;
    uploadQueueVm.checkSharableFiles = checkSharableFiles;
    uploadQueueVm.clearAllFiles = clearAllFiles;
    uploadQueueVm.clearSelectedFiles = clearSelectedFiles;
    uploadQueueVm.continueShareAction = continueShareAction;
    uploadQueueVm.currentPage = 'upload';
    uploadQueueVm.currentSelectedDocument = {};
    uploadQueueVm.fab = {
      isOpen: false,
      count: 0,
      selectedDirection: 'left'
    };
    uploadQueueVm.flowUploadService = flowUploadService;
    uploadQueueVm.fromWhere = $stateParams.from;
    uploadQueueVm.identifiers = [];
    uploadQueueVm.isflowUploadingError = false;
    uploadQueueVm.isFromMySpace = (uploadQueueVm.fromWhere === $scope.mySpacePage);
    uploadQueueVm.loadSidebarContent = loadSidebarContent;
    uploadQueueVm.lsAppConfig = lsAppConfig;
    uploadQueueVm.pauseAllFiles = pauseAllFiles;
    uploadQueueVm.pauseFile = pauseFile;
    uploadQueueVm.pauseSelectedFiles = pauseSelectedFiles;
    uploadQueueVm.removeSelectedDocuments = removeSelectedDocuments;
    uploadQueueVm.retryAllFiles = retryAllFiles;
    uploadQueueVm.retrySelectedFiles = retrySelectedFiles;
    uploadQueueVm.resumeAllFiles = resumeAllFiles;
    uploadQueueVm.resumeFile = resumeFile;
    uploadQueueVm.resumeSelectedFiles = resumeSelectedFiles;
    uploadQueueVm.retryFile = retryFile;
    uploadQueueVm.selectAll = true;
    uploadQueueVm.selectUploadingDocuments = selectUploadingDocuments;
    uploadQueueVm.selectUploadingFile = selectUploadingFile;
    uploadQueueVm.showBtnList = showBtnList;
    uploadQueueVm.showFileInSource = showFileInSource;
    uploadQueueVm.toggleFilterBySelectedFiles = toggleFilterBySelectedFiles;

    activate();

    ////////////////

    /**
     * @namespace activate
     * @desc Activation function of the controller launch at every instantiation
     * @memberOf LinShare.upload.uploadQueueController
     */
    function activate() {
      $translatePartialLoader.addPart('upload');
      $translate.refresh().then(function() {
        $translate([
          'UPLOAD_SHARE.CANCEL',
          'UPLOAD_SHARE.CONTINUE_AND_EXCLUDE',
          'UPLOAD_SHARE.MESSAGE',
          'UPLOAD_SHARE.TITLE'
        ]).then(function(translations) {
          uploadQueueVm.warningCancel = translations['UPLOAD_SHARE.CANCEL'];
          uploadQueueVm.warningContinue = translations['UPLOAD_SHARE.CONTINUE_AND_EXCLUDE'];
          uploadQueueVm.warningMessage = translations['UPLOAD_SHARE.MESSAGE'];
          uploadQueueVm.warningTitle = translations['UPLOAD_SHARE.TITLE'];
        });
      });

      _.forEach(uploadQueueVm.$flow.files, function(file) {
        file.isSelected = false;
        file.hideOnIsolate = false;
      });

      if (idUpload) {
        var fileToHighlight = uploadQueueVm.$flow.getFromUniqueIdentifier(idUpload);
        if(fileToHighlight._from === uploadQueueVm.fromWhere) {
          uploadQueueVm.selectUploadingFile(fileToHighlight, true);
          $timeout(function() {
            window.scrollTo(0, angular.element('div.media-body[data-uid-flow="' + idUpload + '"]').first().offset().top);
          }, 250);
        }
      }

      $scope.$on('flow::fileAdded', function(event, $flow, flowFile) {
        // TODO : choose myspace or workgroup (if workgroup, open a dialog where I can browse folders)
        flowFile._from = $scope.mySpacePage;
        uploadQueueVm.selectUploadingFile(flowFile, true);
        angular.element('.drag-and-drop-ctn').addClass('out-of-focus');
        if (angular.element('upload-box') !== null) {
          angular.element('.info-share').css('opacity', '1');
        }
      });

      $scope.$on('flow::fileError', function fileErrorAction() {
        uploadQueueVm.isflowUploadingError = true;
      });

      $scope.$watch('fab.isOpen', function(isOpen) {
        if (isOpen) {
          angular.element('.md-toolbar-tools').addClass('setWhite');
          angular.element('.multi-select-mobile').addClass('setDisabled');
          $timeout(function() {
            angular.element('#overlayMobileFab').addClass('toggledMobileShowOverlay');
            angular.element('#content-container').addClass('setDisabled');
          }, 250);
        } else {
          angular.element('.md-toolbar-tools').removeClass('setWhite');
          $timeout(function() {
            angular.element('.multi-select-mobile').removeClass('setDisabled');
            angular.element('#overlayMobileFab').removeClass('toggledMobileShowOverlay');
            angular.element('#content-container').removeClass('setDisabled');
          }, 250);
        }
      });
    }

    /**
     * @namespace alertUnsharableFilesSelectedSwal
     * @desc Show alert dialog if error files in selected files list when user confirm share action
     * @param {number} nbErrorFilesSelected - Number of error files in selected files list
     * @param {Function} executeShare - Execute share action
     * @param {Object} shareType - Type of share
     * @memberOf LinShare.upload.uploadQueueController
     */
    function alertUnsharableFilesSelectedSwal(nbErrorFilesSelected, executeShare, shareType) {
      if (nbErrorFilesSelected === 0) {
        executeShare(shareType, uploadQueueVm.selectedDocuments, uploadQueueVm.selectedUploads);
      } else {
        var messageCustom = _.clone(uploadQueueVm.warningMessage).replace('${nbErrorFilesSelected}', nbErrorFilesSelected);
        swal({
            title: uploadQueueVm.warningTitle,
            text: messageCustom,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DD6B55', // TODO : SMA - custom alert
            confirmButtonText: uploadQueueVm.warningContinue,
            cancelButtonText: uploadQueueVm.warningCancel,
            closeOnConfirm: true,
            closeOnCancel: true
          },
          function(isConfirm) {
            if (isConfirm) {
              removeUnsharableFiles();
              executeShare(shareType, uploadQueueVm.selectedDocuments, uploadQueueVm.selectedUploads);
            }
          }
        );
      }
    }

    /**
     * @namespace alertUnsharableFilesSelectedToast
     * @desc Show toast if error files in selected files list when user opens share right sidebar
     * @param {number} nbErrorFilesSelected - Number of error files in selected files list
     * @memberOf LinShare.upload.uploadQueueController
     */
    function alertUnsharableFilesSelectedToast(nbErrorFilesSelected) {
      uploadQueueVm.messageWarningCustom = _.clone(uploadQueueVm.warningMessage).replace('${nbErrorFilesSelected}', nbErrorFilesSelected);
      // TODO : SMA - custom toast
      uploadQueueVm.$mdToast.show({
        scope: $scope,
        preserveScope: true,
        hideDelay: 0,
        position: 'top right',
        templateUrl: 'modules/linshare.upload/views/toast-share-files-alert.html'
      });
    }

    /**
     * @namespace cancelAllFiles
     * @desc Cancel all uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function cancelAllFiles() {
      _.forInRight(uploadQueueVm.$flow.files, function(file) {
        if ((file._from === uploadQueueVm.fromWhere) && !file.isComplete()) {
          uploadQueueVm.removeSelectedDocuments(file);
        }
      });
    }

    /**
     * @namespace cancelSelectedFiles
     * @desc Cancel selected uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function cancelSelectedFiles() {
      _.forInRight(uploadQueueVm.$flow.files, function(file) {
        if (file.isSelected && !file.isComplete()) {
          uploadQueueVm.removeSelectedDocuments(file);
        }
      });
    }

    /**
     * @namespace checkSharableFiles
     * @desc Check list of selected files, if files with error are present
     * @param {boolean} lastReminder - Check if first reminder (to open right sidebar) or last (to valid share)
     * @param {Function} executeShare - Execute share action
     * @param {Object} shareType - Type of share
     * @memberOf LinShare.upload.uploadQueueController
     */
    function checkSharableFiles(lastReminder, executeShare, shareType) {
      uploadQueueVm.nbErrorFilesSelected = 0;
      _.forEach(uploadQueueVm.$flow.files, function(file) {
        if (file.isSelected && file.error) {
          uploadQueueVm.nbErrorFilesSelected++;
        }
      });

      if (uploadQueueVm.nbErrorFilesSelected === lengthOfSelectedDocuments()) {
        growlService.notifyTopRight('UPLOAD_SHARE.NO_SHAREABLE_FILE_SELECTED', 'inverse');
      } else if (lastReminder) {
        alertUnsharableFilesSelectedSwal(uploadQueueVm.nbErrorFilesSelected, executeShare, shareType);
      } else if (!lastReminder && uploadQueueVm.nbErrorFilesSelected > 0) {
        alertUnsharableFilesSelectedToast(uploadQueueVm.nbErrorFilesSelected);
      } else {
        uploadQueueVm.continueShareAction();
      }
    }

    /**
     * @name continueShareAction
     * @desc After check selected files, this function is launched
     */
    function continueShareAction() {
      removeUnsharableFiles();
      uploadQueueVm.$mdToast.hide();
      $scope.onShare();
      uploadQueueVm.loadSidebarContent(uploadQueueVm.lsAppConfig.share);
    }

    /**
     * @namespace clearAllFiles
     * @desc Clear all uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function clearAllFiles() {
      _.forInRight(uploadQueueVm.$flow.files, function(file) {
        if ((file._from === uploadQueueVm.fromWhere) && (file.isComplete() || file.error)) {
          uploadQueueVm.removeSelectedDocuments(file);
        }
      });
    }

    /**
     * @namespace clearSelectedFiles
     * @desc Clear selected uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function clearSelectedFiles() {
      _.forInRight(uploadQueueVm.$flow.files, function(file) {
        if (file.isSelected && (file.isComplete() || file.error)) {
          uploadQueueVm.removeSelectedDocuments(file);
        }
      });
    }

    /**
     * @namespace lengthOfSelectedDocuments
     * @desc Return the length or the array of selected uploads
     * @returns {number} Number of selected files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function lengthOfSelectedDocuments() {
      return Object.keys($scope.selectedUploads).length;
    }

    /**
     * @name loadSidebarContent
     * @desc Update the content of the sidebar
     * @param {string} content - The name of the content to load,
     *                 see app/views/includes/sidebar-right.html for possible values
     */
    function loadSidebarContent(content) {
      $scope.mainVm.sidebar.setData(uploadQueueVm);
      $scope.mainVm.sidebar.setContent(content);
      $scope.mainVm.sidebar.show();
    }

    /**
     * @namespace pauseAllFiles
     * @desc Pause all uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function pauseAllFiles() {
      _.forInRight(uploadQueueVm.$flow.files, function(file) {
        if ((file._from === uploadQueueVm.fromWhere) && !file.paused) {
          uploadQueueVm.pauseFile(file);
        }
      });
      uploadQueueVm.$flow.isPaused = true;
    }

    /**
     * @namespace pauseFile
     * @desc Pause current file
     * @param {Object} flowFile - File uploading to be paused
     * @memberOf LinShare.upload.uploadQueueController
     */
    function pauseFile(flowFile) {
      flowFile.pause();
      flowFile.quotaChecked = false;
    }

    /**
     * @namespace pauseSelectedFiles
     * @desc Pause selected uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function pauseSelectedFiles() {
      _.forEach(uploadQueueVm.$flow.files, function(file) {
        if (file.isSelected && !file.paused) {
          uploadQueueVm.pauseFile(file);
        }
      });
    }

    /**
     * @namespace removeSelectedDocuments
     * @desc Remove selected uploading files
     * @param {Object} flowFile - File uploading to be removed
     * @memberOf LinShare.upload.uploadQueueController
     */
    function removeSelectedDocuments(flowFile) {
      delete $scope.selectedUploads[flowFile.uniqueIdentifier];
      flowFile.cancel();
    }

    /**
     * @namespace removeUnsharableFiles
     * @desc Pop all unsharable files from selected files list
     * @memberOf LinShare.upload.uploadQueueController
     */
    function removeUnsharableFiles() {
      _.forEach(uploadQueueVm.$flow.files, function(file) {
        if (file.isSelected && file.error) {
          file.isSelected = false;
          delete $scope.selectedUploads[file.uniqueIdentifier];
        }
      });
    }

    /**
     * @namespace resetSelectedDocuments
     * @desc Clear the array of selected uploads
     * @memberOf LinShare.upload.uploadQueueController
     */
    function resetSelectedDocuments() {
      _.forEach($scope.selectedUploads, function(value, key) {
        var fileSelected = uploadQueueVm.$flow.getFromUniqueIdentifier(key);
        fileSelected.isSelected = false;
        delete $scope.selectedUploads[key];
      });
      uploadQueueVm.selectAll = true;
    }

    /**
     * @namespace resumeAllFiles
     * @desc Resume all uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function resumeAllFiles() {
      _.forInRight(uploadQueueVm.$flow.files, function(file) {
        if ((file._from === uploadQueueVm.fromWhere) && file.paused) {
          file.resume();
        }
      });
      uploadQueueVm.$flow.isPaused = false;
    }

    /**
     * @namespace resumeFile
     * @desc Resume current file
     * @param {Object} flowFile - File uploading to be resume
     * @memberOf LinShare.upload.uploadQueueController
     */
    function resumeFile(flowFile) {
      flowFile.resume();
      uploadQueueVm.flowUploadService.checkQuotas([flowFile], false, $scope.setUserQuotas);
    }

    /**
     * @namespace resumeSelectedFiles
     * @desc Resume selected uploading files
     * @memberOf LinShare.upload.uploadQueueController
     */
    function resumeSelectedFiles() {
      _.forEach(uploadQueueVm.$flow.files, function(file) {
        if (file.isSelected && file.paused) {
          file.resume();
        }
      });
    }

    /**
     * @namespace retryFile
     * @desc Retry current file
     * @param {Object} flowFile - File uploading to be resume
     * @memberOf LinShare.upload.uploadQueueController
     */
    function retryFile(flowFile) {
      if (flowFile.canBeRetried) {
        uploadQueueVm.flowUploadService.checkQuotas([flowFile], true, $scope.setUserQuotas);
      }
    }

    /**
     * @namespace retryAllFiles
     * @desc Retry all files which get error
     * @memberOf LinShare.upload.uploadQueueController
     */
    function retryAllFiles() {
      _.forInRight(uploadQueueVm.$flow.files, function(file) {
        if ((file._from === uploadQueueVm.fromWhere) && file.error) {
          uploadQueueVm.retryFile(file);
        }
      });
      uploadQueueVm.isflowUploadingError = false;
    }

    /**
     * @namespace retrySelectedFiles
     * @desc Retry selected files which get error
     * @memberOf LinShare.upload.uploadQueueController
     */
    function retrySelectedFiles() {
      _.forEach(uploadQueueVm.$flow.files, function(file) {
        if (file.isSelected && file.error) {
          uploadQueueVm.retryFile(file);
        }
      });
      uploadQueueVm.isflowUploadingError = false;
    }

    /**
     * @namespace selectUploadingDocuments
     * @desc Add the selected element in the selected documents list
     * @param {Array<Object>} flowFiles - Array of files to browse
     * @param {boolean} selectFilesAutomatically - check if the selection is manual or automatic
     * @memberOf LinShare.upload.uploadQueueController
     */
    function selectUploadingDocuments(flowFiles, selectFilesAutomatically) {
      var files = flowFiles || uploadQueueVm.$flow.files;
      var forceSelect = selectFilesAutomatically ? true : uploadQueueVm.selectAll;
      _.forEach(files, function(file) {
        if(file._from === uploadQueueVm.fromWhere) {
          uploadQueueVm.selectUploadingFile(file, forceSelect);
        }
      });

      if (!selectFilesAutomatically) {
        uploadQueueVm.selectAll = !uploadQueueVm.selectAll;
      }
    }

    /**
     * @namespace selectUploadingFile
     * @desc Set specifics values to flowFile in queue
     * @param {Object} file - File uploaded
     * @param {boolean} selectFile - Select file or not
     * @memberOf LinShare.upload.uploadQueueController
     */
    function selectUploadingFile(file, selectFile) {
      file.isSelected = selectFile;
      if (file.isSelected) {
        $scope.selectedUploads[file.uniqueIdentifier] = {
          name: file.name,
          size: file.size,
          type: file.getType(),
          uniqueIdentifier: file.uniqueIdentifier
        };
      } else {
        delete $scope.selectedUploads[file.uniqueIdentifier];
      }
    }

    /**
     * @namespace showBtnList
     * @desc // TODO : [TOFILL]
     * @param {Object} $event - event handle
     * @memberOf LinShare.upload.uploadQueueController
     */
    // TODO : Directive for the button in $event
    function showBtnList($event) {
      var showBtnListElem = $event.currentTarget;
      if (angular.element(showBtnListElem).hasClass('activeShowMore')) {
        angular.element(showBtnListElem).parent().prev().find('div').first()
          .removeClass('data-list-slide-toggle');
        angular.element(showBtnListElem).removeClass('activeShowMore');
      } else {
        angular.element(showBtnListElem).addClass('activeShowMore').parent().prev().find('div')
          .first().addClass('data-list-slide-toggle');
      }
    }

    /**
     * @namespace showFileInSource
     * @desc open the source (workgroup folder or personnal space and select the clicked element)
     * @memberOf LinShare.upload.uploadQueueController
     */
    function showFileInSource(file) {
      if (!_.isUndefined(file.folderDetails)) {
        file.folderDetails.uploadedFileUuid = file.linshareDocument.uuid;
        $state.go('sharedspace.workgroups.entries', file.folderDetails);
      } else {
        $state.go('documents.files', {
          uploadedFileUuid: file.linshareDocument.uuid
        });
      }
    }

    /**
     * @namespace toggleFilterBySelectedFiles
     * @desc isolates files in table or show all
     * @memberOf LinShare.upload.uploadQueueController
     */
    function toggleFilterBySelectedFiles() {
      _.forEach(uploadQueueVm.$flow.files, function(file) {
        if (file.hideOnIsolate) {
          file.hideOnIsolate = false;
        } else if (!file.isSelected) {
          file.hideOnIsolate = true;
        }
      });
    }
  }
})();
