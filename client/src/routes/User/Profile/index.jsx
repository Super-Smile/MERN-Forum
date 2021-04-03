import { Fragment, useContext, useEffect, useState } from 'react';
import { Switch, Route, useHistory, useRouteMatch } from 'react-router-dom';
import { toast } from 'react-toastify';

import { StoreContext } from 'store/Store';

import { BACKEND, Strings } from 'support/Constants';
import { dateFormat } from 'support/Utils';

import Breadcrumbs from 'components/Breadcrumbs';
import { CardBody, BanInfoCard } from 'components/Card';
import Dropdown from 'components/Card/Dropdown';
import { LinkButton } from 'components/Button';
import UserRole from 'components/UserRole';
import Loader from 'components/Loader';
import Errorer from 'components/Errorer';

import Stats from './Stats';
import Threads from './Threads';
import Answers from './Answers';
import Bans from './Bans';

const Profile = ({ userName }) => {
  const { user, token, lang, setModalOpen, setPostType } = useContext(StoreContext)
  const history = useHistory()
  const { url } = useRouteMatch()

  const [userData, setUserData] = useState({})
  const [loading, setLoading] = useState(true)
  const [noData, setNoData] = useState(false)
  const [banned, setBanned] = useState(false)
  const [moder, setModer] = useState(false)

  if (userData.displayName) {
    document.title = `Forum | ${Strings.profile[lang]} ${userData.displayName}`
  }

  useEffect(() => {
    const profileName = userData.displayName || userName
    document.title = `Forum | ${Strings.profile[lang]} ${profileName}`

    if (userData.name === userName) return

    const fetchUser = async () => {
      try {
        const userMethod = user.name === userName ? '/profile' : `/user?userName=${userName}`
        const data = await fetch(`${BACKEND}/api${userMethod}`, {
          headers: {
            Authorization: 'Bearer ' + token
          }
        })
        const response = await data.json()

        if (!response.error) {
          setUserData(response)
          setBanned(!!response.ban)
          setModer(response.role === 2)
          setLoading(false)
          setNoData(false)
        } else throw Error(response.error?.message || 'Error')
      } catch(err) {
        setNoData(true)
        setLoading(false)
      }
    }

    fetchUser()
  }, [userData, userName])

  const editRole = (userId) => {
    const role = moder ? 1 : 2

    fetch(BACKEND + '/api/role/edit', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, role })
    })
      .then(response => response.json())
      .then(data => {
        if (!data.error) {
          setUserData(prev => {
            prev.role = role
            return prev
          })
          setModer(!moder)
        } else throw Error(data.error?.message || 'Error')
      })
      .catch(err => toast.error(err.message))
  }

  const onBan = (userId) => {
    if (banned) {
      fetch(BACKEND + '/api/ban/delete', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })
        .then(response => response.json())
        .then(data => {
          if (!data.error) {
            setBanned(false)
          } else throw Error(data.error?.message || 'Error')
        })
        .catch(err => toast.error(err.message))
    } else {
      setPostType({
        type: 'ban',
        id: userId,
        someData: {
          body: ''
        }
      })
      setModalOpen(true)
    }
  }

  const deleteUser = (userId) => {
    fetch(BACKEND + '/api/user/delete', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    })
      .then(response => response.json())
      .then(data => {
        if (!data.error) {
          history.push('/users')
        } else throw Error(data.error?.message || 'Error')
      })
      .catch(err => toast.error(err.message))
  }

  return (
    <Fragment>
      {!noData ? (
        !loading ? (
          <Switch>
            <Route path={url + '/threads'}>
              <Threads userData={userData} />
            </Route>
            <Route path={url + '/answers'}>
              <Answers userData={userData} />
            </Route>
            <Route path={url + '/bans'}>
              <Bans userData={userData} />
            </Route>
            <Route path={url} exact>
              <Breadcrumbs current={userData.displayName} links={[
                { title: Strings.home[lang], link: '/' },
                { title: Strings.users[lang], link: '/users' }
              ]} />

              {banned && (
                <BanInfoCard data={userData.ban} />
              )}

              <CardBody>
                <div className="profile_head">
                  {userData.picture ? (
                    <div className="profile_picture" style={{ backgroundImage: `url(${BACKEND + userData.picture})` }} />
                  ) : (
                    <div className="profile_picture">{userData.displayName.charAt(0)}</div>
                  )}

                  <div className="profile_head_right">
                    <div className="profile_username">
                      {userData.displayName}
                      <UserRole role={userData.role} />
                    </div>
                    <div>
                      {new Date() - new Date(userData.onlineAt) < 5 * 60000
                        ? 'online'
                        : Strings.lastSeen[lang] + ' ' + dateFormat(userData.onlineAt)
                      }
                    </div>

                    {user.id === userData._id ? (
                      <div className="profile_head_actions">
                        <LinkButton
                          link={'/user/' + userData.name + '/settings'}
                          className="hollow"
                          text={Strings.settings[lang]}
                        />
                      </div>
                    ) : (
                      <div className="profile_head_actions">
                        <LinkButton
                          link={'/messages/' + userData.name}
                          className="hollow"
                          text={Strings.message[lang]}
                        />
                      </div>
                    )}
                  </div>

                  {user.role >= 2 && user.id !== userData._id ? (
                    <Dropdown>
                      {user.role === 3 && (
                        <Fragment>
                          <div onClick={() => editRole(userData._id)} className="dropdown_item">
                            {moder ? Strings.removeModerator[lang] : Strings.appointAsAModerator[lang]}
                          </div>
                          <div onClick={() => deleteUser(userData._id)} className="dropdown_item">{Strings.delete[lang]}</div>
                        </Fragment>
                      )}
                      {user.role > userData.role && (
                        <div onClick={() => onBan(userData._id)} className="dropdown_item">
                          {banned ? Strings.unbanUser[lang] : Strings.banUser[lang]}
                        </div>
                      )}
                    </Dropdown>
                  ) : null}
                </div>
              </CardBody>

              <Stats userData={userData} lang={lang} token={token} />
            </Route>
          </Switch>
        ) : <Loader color="#64707d" />
      ) : (
        <Fragment>
          <Breadcrumbs current={Strings.error[lang]} links={[
            { title: Strings.home[lang], link: '/' },
            { title: Strings.users[lang], link: '/users' }
          ]} />

          <Errorer message={Strings.unableToDisplayUserProfile[lang]} />
        </Fragment>
      )}
    </Fragment>
  )
}

export default Profile;