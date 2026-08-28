(function createRoomRegistry(global) {
  'use strict';

  const rooms = [
    {
      id: 'filter_bubble',
      key: 'filter',
      order: 1,
      name: '逃離過濾氣泡',
      folder: 'rooms/filter-bubble/',
      roomTitle: '高中｜主題1｜逃離過濾氣泡｜GAILearn',
      mapEntryTitle: '高中｜互動地圖｜主題1－逃離過濾氣泡入口｜GAILearn',
    },
    {
      id: 'sift_detective',
      key: 'sift',
      order: 2,
      name: 'SIFT偵探',
      folder: 'rooms/sift-detective/',
      roomTitle: '高中｜主題2｜SIFT偵探｜GAILearn',
      mapEntryTitle: '高中｜互動地圖｜主題2－SIFT偵探入口｜GAILearn',
    },
    {
      id: 'collaboration_director',
      key: 'collab',
      order: 3,
      name: 'AI夥伴協作導演',
      folder: 'rooms/ai-collaboration-director/',
      roomTitle: '高中｜主題3｜AI夥伴協作導演｜GAILearn',
      mapEntryTitle: '高中｜互動地圖｜主題3－AI夥伴協作導演入口｜GAILearn',
    },
    {
      id: 'companion_designer',
      key: 'companion',
      order: 4,
      name: 'AI學伴設計師',
      folder: 'rooms/ai-companion-designer/',
      roomTitle: '高中｜主題4｜AI學伴設計師｜GAILearn',
      mapEntryTitle: '高中｜互動地圖｜主題4－AI學伴設計師入口｜GAILearn',
    },
  ].map(Object.freeze);

  function get(roomId) {
    return rooms.find((room) => room.id === roomId) || null;
  }

  global.GAILearnRooms = Object.freeze({
    mapTitle: '高中｜互動地圖｜AI學習基地｜GAILearn',
    rooms: Object.freeze(rooms),
    get,
  });
})(window);
