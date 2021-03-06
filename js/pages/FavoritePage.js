import React, {Component} from 'react';
import {FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import actions from '../action/index';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import NavigationUtil from '../navigators/NavigationUtil';
import Toast from 'react-native-easy-toast';
import NavigationBar from '../common/NavigationBar';
import FavoriteDao from '../expand/dao/FavoriteDao';
import {FLAG_STORAGE} from '../expand/dao/DataStore';
import FavoriteUtil from '../util/FavoriteUtil';
import TrendingItem from '../common/TrendingItem';
import PopularItem from '../common/PopularItem';
import EventBus from 'react-native-event-bus';
import EventTypes from '../util/EventTypes';

const Tab = createMaterialTopTabNavigator();

type Props = {};

class FavoritePage extends Component<Props> {
  constructor(props) {
    super(props);
  }

  render() {
    const {theme} = this.props;
    let statusBar = {
      backgroundColor: theme.themeColor,
      barStyle: 'light-content',
    };
    let navigationBar = (
      <NavigationBar
        title={'收藏'}
        statusBar={statusBar}
        style={{backgroundColor: theme.themeColor}}
      />
    );
    const TabNavigator = (
      <Tab.Navigator
        tabBarOptions={{
          tabStyle: styles.tabStyle,
          upperCaseLabel: false, //是否使标签大写，默认为true
          style: {
            backgroundColor: theme.themeColor, //TabBar 的背景颜色
          },
          indicatorStyle: styles.indicatorStyle, //标签指示器的样式
          labelStyle: styles.labelStyle, //文字的样式
        }}>
        <Tab.Screen name={'tabPopular'} options={{title: '最热'}}>
          {() => (
            <FavoriteTabPage
              {...this.props}
              flag={FLAG_STORAGE.flag_popular}
              theme={theme}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name={'tabTrending'} options={{title: '趋势'}}>
          {() => (
            <FavoriteTabPage
              {...this.props}
              flag={FLAG_STORAGE.flag_trending}
              theme={theme}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    );

    return (
      <View style={styles.container}>
        {navigationBar}
        {TabNavigator}
      </View>
    );
  }
}

const mapFavoriteStateToProps = (state) => ({
  theme: state.theme.theme,
});

//注意：connect只是个function，并不应定非要放在export后面
export default connect(mapFavoriteStateToProps, null)(FavoritePage);

class FavoriteTab extends Component<Props> {
  constructor(props) {
    super(props);
    const {flag} = this.props;
    this.storeName = flag;
    this.favoriteDao = new FavoriteDao(flag);
  }

  componentDidMount() {
    this.loadData(true);
    this.unsubscribe = this.props.navigation.addListener('tabPress', (e) => {
      this.loadData(false);
    });
  }

  componentWillUnmount() {
    this.props.navigation.removeListener(this.unsubscribe);
  }

  loadData(isShowLoading) {
    const {onLoadFavoriteData} = this.props;
    onLoadFavoriteData(this.storeName, isShowLoading);
  }

  /**
   * 获取与当前页面有关的数据
   * @returns {*}
   * @private
   */
  _store() {
    const {favorite} = this.props;
    let store = favorite[this.storeName];
    if (!store) {
      store = {
        items: [],
        isLoading: false,
        projectModels: [], //要显示的数据
      };
    }
    return store;
  }

  onFavorite(item, isFavorite) {
    FavoriteUtil.onFavorite(this.favoriteDao, item, isFavorite, this.storeName);
    if (this.storeName === FLAG_STORAGE.flag_popular) {
      EventBus.getInstance().fireEvent(EventTypes.favorite_changed_popular);
    } else {
      EventBus.getInstance().fireEvent(EventTypes.favoriteChanged_trending);
    }
  }

  renderItem(data) {
    const item = data.item;
    const Item =
      this.storeName === FLAG_STORAGE.flag_popular ? PopularItem : TrendingItem;
    return (
      <Item
        theme={this.props.theme}
        projectModel={item}
        onSelect={(callback) => {
          NavigationUtil.goPage(
            {
              projectModel: item,
              flag: this.storeName,
              callback,
              isFavoritePage: true,
            },
            'DetailPage',
          );
        }}
        onFavorite={(item, isFavorite) => this.onFavorite(item, isFavorite)}
      />
    );
  }

  render() {
    const {theme} = this.props;
    let store = this._store();
    return (
      <View style={styles.container}>
        <FlatList
          data={store.projectModels}
          renderItem={(data) => this.renderItem(data)}
          keyExtractor={(item, index) => '' + index}
          refreshControl={
            <RefreshControl
              title={'Loading'}
              titleColor={theme.themeColor}
              colors={[theme.themeColor]}
              refreshing={store.isLoading}
              onRefresh={() => this.loadData(true)}
              tintColor={theme.themeColor}
            />
          }
        />
        <Toast ref={'toast'} position={'center'} />
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  favorite: state.favorite,
});

const mapDispatchToProps = (dispatch) => ({
  //将 dispatch(onRefreshPopular(storeName, url))绑定到props
  onLoadFavoriteData: (storeName, isShowLoading) =>
    dispatch(actions.onLoadFavoriteData(storeName, isShowLoading)),
});

//注意：connect只是个function，并不应定非要放在export后面
const FavoriteTabPage = connect(
  mapStateToProps,
  mapDispatchToProps,
)(FavoriteTab);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabStyle: {
    // minWidth: 50 //fix minWidth会导致tabStyle初次加载时闪烁
    padding: 0,
  },
  indicatorStyle: {
    height: 2,
    backgroundColor: 'white',
  },
  labelStyle: {
    fontSize: 13,
    margin: 0,
    color: 'white',
  },
  indicatorContainer: {
    alignItems: 'center',
  },
  indicator: {
    color: 'red',
    margin: 10,
  },
});
