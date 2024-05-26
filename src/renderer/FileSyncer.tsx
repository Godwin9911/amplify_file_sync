import {
  Flex,
  Text,
  useTheme,
  View,
  Heading,
  Button,
  Loader,
} from '@aws-amplify/ui-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MdChevronLeft,
  MdFileOpen,
  MdFileUpload,
  MdFolder,
} from 'react-icons/md';

import { uploadData, isCancelError } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/api';
import { Schema } from './amplify/data/resource';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { ColorRing } from 'react-loader-spinner';
import { cloneDeep, isEmpty } from 'lodash';

const client = generateClient<Schema>();
const { fs, os }: any = window;

function humanFileSize(size) {
  var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) * 1 +
    ' ' +
    ['B', 'kB', 'MB', 'GB', 'TB'][i]
  );
}

export default function FileSyncer({ user }) {
  const { tokens } = useTheme();
  const [_filesRef, _setFilesRef] = useState({ current: {} });
  const [show, setShow] = useState(true);
  const filesRef = useRef<any>({});

  const uploadHandler = async ({ path, file }: any) => {
    console.log('uploaded...');

    // Pause, resume, and cancel a task
    const localPath = path;

    const remotePath = path
      .replace(`${os.homedir()}`, '')
      .replaceAll(/\\/g, '/');

    try {
      console.log(remotePath, 'uploads');
      console.log(filesRef, String(remotePath));

      const uploadTask = uploadData({
        path: `picture-submissions/${user.userId}${remotePath}`,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              filesRef.current[String(remotePath)].precentage = Math.round(
                (transferredBytes / totalBytes) * 100,
              );
              console.log(
                'bytes',
                filesRef.current,
                transferredBytes,
                totalBytes,
              );
              _setFilesRef({ ...filesRef });
            }
          },
        },
      });

      filesRef.current[String(remotePath)] = {
        remotePath,
        localPath,
        originalFile: file,
        uploadTaskFunc: uploadTask,
        percentage: 0,
      };

      console.log(filesRef.current);
      _setFilesRef({ ...filesRef });
      // return;

      /*  */

      //  filesRef.current[remotePath].uploadTaskFunc = uploadTask;

      /* //...
    uploadTask.pause();
    //...
    uploadTask.resume();
    //...
    uploadTask.cancel();
    //... */

      const result = await uploadTask.result;
      console.log(result, 'kkd');

      /*   const updateResponse = await client.models.SyncedFiles.update({
        id: fileData.id,
        path: result?.path,
      });pCr

      console.log(updateResponse); */

      toast.success('Uploaded');
    } catch (error) {
      console.log(error);
      if (isCancelError(error)) {
        delete filesRef.current[String(remotePath)];
        _setFilesRef({ ...filesRef });
        toast.error(`Cancelled - ${remotePath}`);
      }
    }
  };

  const handleFileChanged = async (path: string) => {
    const [file] = await window.electron.getFile(path);
    console.log('change', path, file);

    // replace uploaded
    uploadHandler({
      path,
      file,
    });
  };

  const handleFileAdd = async (path: string) => {
    const [file] = await window.electron.getFile(path);
    console.log('add', path, file);

    // upload
    uploadHandler({
      path,
      file,
    });
  };

  // Set up default folder
  useEffect(() => {
    const { fs, os }: any = window;
    const dir = `${os.homedir()}/sync_folder`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    window.electron.ipcRenderer.on('file:add', handleFileAdd);
    window.electron.ipcRenderer.on('file:change', handleFileChanged);
    /*  window.electron.ipcRenderer.on('file:unlink', async (path: string) => {
      // delete on AWS
    }); */

    // clean up === --------
    return () => {
      window.electron.ipcRenderer.removeAllListeners('file:change');
      window.electron.ipcRenderer.removeAllListeners('file:add');
    };
  }, []);

  return (
    <View
      position="fixed"
      width="calc(100vw - 1rem)"
      //  height="50vh"
      style={{
        zIndex: '100',
        bottom: 0,
        backgroundColor: '#fff',
        boxShadow:
          '0 4px 8px rgba(169,194,209,.25),0 16px 32px rgba(169,194,209,.25)',
        border: '1px solid #efefef',
      }}
      padding={tokens.space.medium}
      borderRadius={tokens.space.xs}
      margin={tokens.space.xs}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Heading
          width="30vw"
          level={6}
          marginBottom={0}
          padding={tokens.space.small}
          onClick={() => setShow(!show)}
        >
          {_filesRef?.current ? Object.keys(_filesRef?.current)?.length : null}{' '}
          Upload(s)
        </Heading>

        <Button
          padding={tokens.space.xs}
          //  fontSize={tokens.space.xs}
          height="fit-content"
          onClick={() => setShow(!show)}
        >
          <MdChevronLeft
            style={show ? { rotate: '270deg' } : { rotate: '90deg' }}
          />
        </Button>
      </Flex>

      <View
        maxHeight={show ? 'calc(40vh)' : '0'}
        style={{ transition: 'max-height 0.15s ease-out' }}
        overflow={'auto'}
      >
        {/*  {JSON.stringify(_filesRef)} */}
        {!isEmpty(_filesRef) &&
          Object.keys(cloneDeep(_filesRef)?.current)?.map((el, index) => (
            <Flex
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              margin={tokens.space.small}
              padding={tokens.space.small}
              borderColor="hsl(190, 70%, 70%)"
              backgroundColor="rgb(248, 250, 251)"
              gap={tokens.space.medium}
              grow={1}
              alignItems="center"
            >
              <MdFileOpen
                style={{
                  ...(_filesRef?.current[el].uploadTaskFunc.state === 'SUCCESS'
                    ? { color: 'green' }
                    : { color: '' }),
                  fontSize: '2rem',
                }}
              />
              <View grow={1}>
                <Text as="p">{_filesRef?.current[el].originalFile.name}</Text>{' '}
                {_filesRef?.current[el].uploadTaskFunc.state !== 'SUCCESS' ? (
                  <Loader
                    variation="linear"
                    percentage={_filesRef?.current[el].precentage}
                    isDeterminate
                    isPercentageTextHidden
                  />
                ) : null}
                <Flex fontSize={tokens.space.small}>
                  <Text as="p">
                    {humanFileSize(_filesRef?.current[el].originalFile.size)}
                  </Text>
                  <Text as="p">
                    {' '}
                    {format(
                      _filesRef?.current[el].originalFile.lastModified,
                      'dd MMM, yyyy',
                    )}
                  </Text>
                </Flex>
              </View>
            </Flex>
          ))}{' '}
      </View>
    </View>
  );
}
