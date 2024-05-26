import {
  Flex,
  Text,
  Card,
  useTheme,
  View,
  Grid,
  Divider,
  Heading,
  Button,
  Loader,
  Menu,
  MenuItem,
  Authenticator,
} from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';
import '@aws-amplify/ui-react/styles.css';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
// import icon from '../../assets/icon.svg';
import './App.scss';
import {
  MdChevronRight,
  MdFolder,
  MdFileOpen,
  MdOutlineInsertDriveFile,
  MdHome,
  MdSyncAlt,
  MdSync,
  MdAccountCircle,
} from 'react-icons/md';

import type { Schema } from './amplify/data/resource';
import { generateClient } from 'aws-amplify/data';
import { uploadData, list, getUrl } from 'aws-amplify/storage';
import { Breadcrumbs } from '@aws-amplify/ui-react';
import { get, isEmpty } from 'lodash';

import FileSyncer from './FileSyncer';
import { format } from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ColorRing } from 'react-loader-spinner';

function humanFileSize(size) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) * 1 +
    ' ' +
    ['B', 'kB', 'MB', 'GB', 'TB'][i]
  );
}

// const client = generateClient<Schema>();

function FileBread({ crumbs = [], setCrumbs, listFiles }) {
  return (
    <Flex justifyContent="space-between" alignItems="center">
      <Breadcrumbs.Container>
        <Breadcrumbs.Item>
          <Breadcrumbs.Link onClick={() => listFiles()} title="Refresh">
            <MdSync />
          </Breadcrumbs.Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>
          <Breadcrumbs.Link onClick={() => listFiles()}>
            <MdHome />
          </Breadcrumbs.Link>
          <MdChevronRight />
        </Breadcrumbs.Item>
        {crumbs.map((el, index) => (
          <Breadcrumbs.Item
            key={el}
            style={el === 'picture-submissions' ? { display: 'none' } : {}}
          >
            <Breadcrumbs.Link
              onClick={() => {
                //  console.log(crumbs, index);
                setCrumbs((crumbs) => crumbs.filter((c, i) => i <= index));
                listFiles();
              }}
            >
              {el}
            </Breadcrumbs.Link>
            <MdChevronRight />
          </Breadcrumbs.Item>
        ))}
      </Breadcrumbs.Container>

      {/*   <Button>{'  '}Sync</Button> */}
    </Flex>
  );
}

function Home({ user }) {
  // console.log(window.os.homedir());
  const { tokens } = useTheme();
  const [crumbs, setCrumbs] = useState(['picture-submissions', user.userId]);

  const [files, setFiles] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  /*   useEffect(() => {
    client.models.SyncedFiles.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }, []); */

  function processStorageList(response) {
    const filesystem = {};
    // https://stackoverflow.com/questions/44759750/how-can-i-create-a-nested-object-representation-of-a-folder-structure
    const add = (source, target, item) => {
      const elements = source.split('/');
      const element = elements.shift();
      if (!element) return; // blank
      target[element] = target[element] || { __data: item }; // element;
      if (elements.length) {
        target[element] =
          typeof target[element] === 'object' ? target[element] : {};
        add(elements.join('/'), target[element], item);
      }
    };
    response.items.forEach((item) => add(item.path, filesystem, item));
    return filesystem;
  }

  const listFiles = async () => {
    try {
      setIsLoading(true);
      const result = await list({
        path: `picture-submissions/${user.userId}`,

        /*   path: ({ identityId }) => {
          console.log(identityId);
          return `picture-submissions/${identityId}/`;
        }, */

        // Alternatively, path: ({identityId}) => `album/{identityId}/photos/`
      });

      console.log(processStorageList(result));
      setFiles(processStorageList(result));
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    listFiles();
  }, []);

  useEffect(() => {
    console.log(files);
  }, [files]);

  function downloadURI(uri, name = '') {
    const link = document.createElement('a');
    // link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
  }
  function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(
      function () {
        console.log('Async: Copying to clipboard was successful!');
      },
      function (err) {
        console.error('Async: Could not copy text: ', err);
      },
    );
  }

  const getFileUrl = async ({ path, share = false }) => {
    try {
      setIsLoading(true);

      if (share) {
        // copyTextToClipboard(`http://localhost:5173/?file=${path}`);

        copyTextToClipboard(
          `https://main.d4c4zbq9x7suw.amplifyapp.com/?file=${path}`,
        );

        toast.success('Copied to clipboard');
        return;
      }

      const linkToStorageFile = await getUrl({
        path,
        // Alternatively, path: ({identityId}) => `album/{identityId}/1.jpg`
        options: {
          // validateObjectExistence: false, // defaults to false
          // expiresIn: 20, // validity of the URL, in seconds. defaults to 900 (15 minutes) and maxes at 3600 (1 hour)
          //   useAccelerateEndpoint: true, // Whether to use accelerate endpoint.
        },
      });

      console.log(linkToStorageFile);
      console.log(linkToStorageFile.url.toString());
      console.log(share);

      downloadURI(linkToStorageFile.url.toString());

      console.log('signed URL: ', linkToStorageFile.url);
      console.log('URL expires at: ', linkToStorageFile.expiresAt);
    } catch (error) {
      console.log(error);
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      backgroundColor={tokens.colors.background.secondary}
      padding={tokens.space.medium}
      minHeight="100vh"
      margin={0}
    >
      <ToastContainer />
      {/*   {window.os.homedir()} */}

      <FileBread crumbs={crumbs} setCrumbs={setCrumbs} listFiles={listFiles} />

      <Divider marginTop={16} marginBottom={16} />

      <Grid
        templateColumns="1fr 1fr 1fr"
        templateRows="10rem 10rem"
        gap={tokens.space.small}
      >
        {!isEmpty(files) &&
          Object.keys(get(files, crumbs.join('.')))
            .filter((el) => el !== '__data')
            .map((el) => {
              //console.log();
              const theFile = get(files, crumbs.join('.'))[el]?.__data;

              //  console.log(theFile);

              return (
                <Card
                  key={el}
                  padding={16}
                  borderRadius={tokens.space.small}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow:
                      '0px 2px 4px rgba(169,194,209,.05), 0px 12px 16px rgba(169,194,209,.1)',
                  }}
                  onClick={() =>
                    !el.includes('.') ? setCrumbs([...crumbs, el]) : null
                  }
                  position="relative"
                >
                  {/*  {JSON.stringify(files[el])} */}
                  {el.includes('.') ? (
                    <View position="absolute" top={0} right={10}>
                      <Menu menuAlign="end" border="0" size="small">
                        <MenuItem
                          onClick={() =>
                            getFileUrl({ path: theFile.path, share: false })
                          }
                        >
                          Download
                        </MenuItem>
                        <MenuItem
                          onClick={() =>
                            getFileUrl({ path: theFile.path, share: true })
                          }
                        >
                          Share Link
                        </MenuItem>
                      </Menu>
                    </View>
                  ) : null}
                  <View textAlign="center" title={el}>
                    {!el.includes('.') ? (
                      <MdFolder
                        style={{ color: '#FDBF5E', fontSize: '4rem' }}
                      />
                    ) : (
                      <MdOutlineInsertDriveFile
                        style={{ color: '', fontSize: '4rem' }}
                      />
                    )}
                    <Text as="p">{el}</Text>
                  </View>

                  <Flex
                    justifyContent="space-between"
                    fontSize={tokens.space.small}
                  >
                    {!el.includes('.') ? (
                      <span></span>
                    ) : (
                      <Text as="p">{humanFileSize(theFile.size)}</Text>
                    )}
                    <Text as="p">
                      {format(theFile.lastModified, 'dd MMM, yyyy')}
                    </Text>
                  </Flex>
                </Card>
              );
            })}
      </Grid>
      {isLoading && (
        <Flex
          alignItems="center"
          justifyContent="center"
          style={{
            zIndex: '200',
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            top: 0,
          }}
        >
          <div style={{ backgroundColor: '#fff', padding: '1.5rem' }}>
            <ColorRing
              visible={true}
              height="80"
              width="80"
              ariaLabel="color-ring-loading"
              wrapperStyle={{}}
              wrapperClass="color-ring-wrapper"
              colors={['#e15b64', '#f47e60', '#f8b26a', '#abbd81', '#849b87']}
            />
          </div>
        </Flex>
      )}
    </View>
  );
}

export default function App() {
  return (
    <Authenticator
      components={{
        Header() {
          return (
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <h1 style={{ marginBottom: '0.5rem' }}>FileSyncDrive</h1>
              <p>Sync your local files</p>
            </div>
          );
        },
      }}
    >
      {({ signOut, user }) => (
        <>
          <Flex
            alignItems="center"
            justifyContent="between"
            padding={16}
            paddingTop={1}
            paddingBottom={1}
          >
            <View grow={1}>
              <h1>File Sync Drive</h1>
            </View>
            <Flex>
              <Button onClick={signOut}>
                {user?.signInDetails?.loginId} - Sign out
              </Button>
            </Flex>
          </Flex>

          <Router>
            <Routes>
              <Route path="/" element={<Home user={user} />} />
            </Routes>
          </Router>
          <FileSyncer user={user} />
        </>
      )}
    </Authenticator>
  );
}
