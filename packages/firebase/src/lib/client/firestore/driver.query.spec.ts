import { authorizedTestWithMockItemCollection } from "../../../test/client/firestore.mock.item.fixture.authorized";
import { describeQueryDriverTests } from "../../../test/common/test.driver.query";

authorizedTestWithMockItemCollection((f) => {
  describeQueryDriverTests(f);
});
