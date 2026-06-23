use std::collections::HashMap;
use std::sync::OnceLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum LabelCategory {
    Food,
    Drink,
    Tableware,
    CookingTool,
    FoodContext,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum FoodKind {
    Meal,
    Dessert,
    Drink,
    Fruit,
    Vegetable,
    Seafood,
    UnknownFood,
}

static IMAGENET_LABELS: OnceLock<Vec<String>> = OnceLock::new();

pub fn get_imagenet_label(index: usize) -> &'static str {
    let labels = IMAGENET_LABELS.get_or_init(|| {
        let json_str = include_str!("../../../assets/imagenet-1k-id2label.json");
        let map: HashMap<String, String> = serde_json::from_str(json_str)
            .expect("Failed to parse ImageNet-1K label JSON");
        
        let mut labels = vec!["unknown object".to_string(); 1000];
        for (k, v) in map {
            if let Ok(idx) = k.parse::<usize>() {
                if idx < labels.len() {
                    labels[idx] = v;
                }
            }
        }
        labels
    });

    if index < labels.len() {
        &labels[index]
    } else {
        "unknown object"
    }
}

pub fn classify_label(label: &str) -> LabelCategory {
    let label = label.to_lowercase();

    // Food
    if contains_any(&label, &[
        // Seafood / Poultry
        "tench", "goldfish", "shark", "ray", "stingray", "cock", "hen",
        "crab", "lobster", "crayfish", "crawfish", "crawdad",
        // Dishes / Prepared food
        "pizza", "cheeseburger", "burger", "hot dog", "hotdog", "carbonara", "burrito", "potpie", "meat loaf", "meatloaf", "guacamole", "consomme", "hot pot", "hotpot", "trifle", "mashed potato",
        // Fruits
        "banana", "strawberry", "orange", "lemon", "fig", "pineapple", "ananas", "jackfruit", "custard apple", "pomegranate", "granny smith",
        // Vegetables
        "broccoli", "cauliflower", "cabbage", "zucchini", "courgette", "squash", "cucumber", "cuke", "artichoke", "pepper", "cardoon", "corn",
        // Sweets / Bakery
        "ice cream", "icecream", "ice lolly", "popsicle", "lollipop", "loaf", "bagel", "beigel", "pretzel", "dough", "chocolate sauce", "chocolate syrup",
        // Fungi
        "mushroom", "coral fungus", "agaric", "gyromitra", "stinkhorn", "earthstar", "hen-of-the-woods", "bolete",
        // Others
        "hay",
    ]) {
        return LabelCategory::Food;
    }

    // Drink
    if contains_any(&label, &["espresso", "eggnog", "red wine", "wine", "beer", "coffee", "tea", "cider", "juice", "soda", "pop bottle", "soda bottle"]) {
        return LabelCategory::Drink;
    }

    // Tableware
    if contains_any(&label, &["plate", "cup", "bowl", "tray", "soup bowl", "measuring cup", "coffee mug", "coffeepot", "teapot", "goblet", "saucer", "plate rack", "dishrag", "dishcloth", "dishwasher"]) {
        return LabelCategory::Tableware;
    }

    // CookingTool
    if contains_any(&label, &["frying pan", "skillet", "wok", "cleaver", "meat cleaver", "chopper", "can opener", "tin opener", "corkscrew", "ladle", "wooden spoon", "spatula", "waffle iron", "rotisserie", "pot", "flowerpot", "crock pot", "crockpot", "chime", "mortar", "pestle", "sieve", "funnel"]) {
        return LabelCategory::CookingTool;
    }

    // FoodContext
    if contains_any(&label, &["grocery store", "grocery", "food market", "market", "bakery", "bakeshop", "bakehouse", "restaurant", "eating house", "eating place", "eatery", "butcher shop", "meat market", "confectionery", "confectionary", "candy store"]) {
        return LabelCategory::FoodContext;
    }

    LabelCategory::Other
}

pub fn classify_food_kind(label: &str) -> FoodKind {
    let label = label.to_lowercase();
    
    if contains_any(&label, &["espresso", "eggnog", "red wine", "wine", "beer", "coffee", "tea", "cider", "juice", "soda", "pop bottle", "soda bottle"]) {
        return FoodKind::Drink;
    }
    
    if contains_any(&label, &["banana", "strawberry", "orange", "lemon", "fig", "pineapple", "ananas", "jackfruit", "custard apple", "pomegranate", "granny smith", "apple", "grape", "peach", "pear", "melon", "cherry", "berry", "plum"]) {
        return FoodKind::Fruit;
    }
    
    if contains_any(&label, &["broccoli", "cauliflower", "cabbage", "zucchini", "courgette", "squash", "cucumber", "cuke", "artichoke", "pepper", "cardoon", "corn", "potato", "onion", "garlic", "mushroom", "fungus", "agaric", "gyromitra", "stinkhorn", "earthstar", "bolete", "salad"]) {
        return FoodKind::Vegetable;
    }
    
    if contains_any(&label, &["tench", "goldfish", "shark", "ray", "stingray", "crab", "lobster", "crayfish", "crawfish", "crawdad", "fish", "eel", "sturgeon", "salmon", "trout", "oyster", "clam", "mussel", "shrimp", "prawn", "squid", "octopus"]) {
        return FoodKind::Seafood;
    }
    
    if contains_any(&label, &["ice cream", "icecream", "ice lolly", "popsicle", "lollipop", "trifle", "chocolate", "sauce", "syrup", "cake", "cookie", "pastry", "doughnut", "donut", "custard", "pudding", "tart", "muffin", "sweet"]) {
        return FoodKind::Dessert;
    }
    
    if contains_any(&label, &["pizza", "cheeseburger", "burger", "hot dog", "hotdog", "carbonara", "burrito", "potpie", "meat loaf", "meatloaf", "guacamole", "consomme", "hot pot", "hotpot", "mashed potato", "spaghetti", "pasta", "rice", "noodle", "soup", "stew", "curry", "steak", "taco", "sandwich", "bread", "loaf", "bagel", "beigel", "pretzel", "dough"]) {
        return FoodKind::Meal;
    }
    
    FoodKind::UnknownFood
}

fn contains_any(label: &str, words: &[&str]) -> bool {
    words.iter().any(|word| label.contains(word))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_imagenet_label() {
        assert_eq!(get_imagenet_label(923), "plate");
        assert_eq!(get_imagenet_label(963), "pizza, pizza pie");
        assert_eq!(get_imagenet_label(1000), "unknown object");
    }

    #[test]
    fn test_classify_label() {
        assert_eq!(classify_label("pizza, pizza pie"), LabelCategory::Food);
        assert_eq!(classify_label("red wine"), LabelCategory::Drink);
        assert_eq!(classify_label("plate"), LabelCategory::Tableware);
        assert_eq!(classify_label("frying pan"), LabelCategory::CookingTool);
        assert_eq!(classify_label("bakery"), LabelCategory::FoodContext);
        assert_eq!(classify_label("laptop"), LabelCategory::Other);
    }

    #[test]
    fn test_classify_food_kind() {
        assert_eq!(classify_food_kind("pizza"), FoodKind::Meal);
        assert_eq!(classify_food_kind("ice cream"), FoodKind::Dessert);
        assert_eq!(classify_food_kind("red wine"), FoodKind::Drink);
        assert_eq!(classify_food_kind("banana"), FoodKind::Fruit);
        assert_eq!(classify_food_kind("broccoli"), FoodKind::Vegetable);
        assert_eq!(classify_food_kind("crab"), FoodKind::Seafood);
        assert_eq!(classify_food_kind("laptop"), FoodKind::UnknownFood);
    }
}

